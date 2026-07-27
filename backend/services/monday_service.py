import os
import time
import logging
import httpx
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(override=True)

# Cache settings
CACHE_EXPIRY_SECONDS = int(os.getenv("CACHE_TIMEOUT", "300")) # 5 minutes default data cache
METADATA_CACHE_EXPIRY_SECONDS = 1800 # 30 minutes metadata cache

class MondayService:
    def __init__(self):
        self.api_key = os.getenv("MONDAY_API_KEY")
        self.deals_board_id = os.getenv("MONDAY_DEALS_BOARD_ID")
        self.wo_board_id = os.getenv("MONDAY_WORK_ORDERS_BOARD_ID")
        
        self.api_url = "https://api.monday.com/v2"
        self.headers = {
            "Authorization": self.api_key if self.api_key else "",
            "Content-Type": "application/json",
            "API-Version": "2023-10"
        }
        
        # Cache storage for data and 30-min metadata
        self._deals_cache: Optional[pd.DataFrame] = None
        self._wo_cache: Optional[pd.DataFrame] = None
        self._deals_cache_time: float = 0.0
        self._wo_cache_time: float = 0.0
        
        self._metadata_cache: Dict[str, Dict[str, str]] = {}
        self._metadata_cache_time: Dict[str, float] = {}

    def is_live_configured(self) -> bool:
        return bool(self.api_key and self.deals_board_id and self.wo_board_id)

    def _fetch_from_monday_api(self, board_id: str) -> pd.DataFrame:
        """
        Fetches columns and rows from a Monday.com board.
        Uses pagination and dynamic column mapping.
        """
        # Step 1: Query column metadata (with 30-minute caching optimization)
        now = time.time()
        if board_id in self._metadata_cache and (now - self._metadata_cache_time.get(board_id, 0)) < METADATA_CACHE_EXPIRY_SECONDS:
            logger.info(f"Using cached 30-min column metadata for board: {board_id}")
            col_mapping = self._metadata_cache[board_id]
        else:
            meta_query = f"""
            query {{
              boards(ids: [{board_id}]) {{
                columns {{
                  id
                  title
                  type
                }}
              }}
            }}
            """
            col_mapping = {}
            try:
                logger.info(f"Querying Monday board metadata for board: {board_id}")
                response = self._post_with_retry(meta_query)
                data = response.json()
                if "errors" in data:
                    raise Exception(f"Monday API Error: {data['errors']}")
                
                boards = data.get("data", {}).get("boards", [])
                if not boards:
                    raise Exception(f"Board ID {board_id} not found in Monday.com workspace.")
                    
                columns = boards[0].get("columns", [])
                col_mapping = {col["id"]: col["title"] for col in columns}
                self._metadata_cache[board_id] = col_mapping
                self._metadata_cache_time[board_id] = now
                logger.info(f"Mapped and cached {len(col_mapping)} columns for board {board_id} (30-min TTL)")
            except Exception as e:
                logger.error(f"Error fetching column mapping: {e}")
                raise e

        # Step 2: Fetch items page by page
        items = []
        cursor = None
        has_more = True
        limit = 500
        
        while has_more:
            if cursor:
                query = f"""
                query {{
                  boards(ids: [{board_id}]) {{
                    items_page(limit: {limit}, cursor: "{cursor}") {{
                      cursor
                      items {{
                        name
                        column_values {{
                          id
                          text
                        }}
                      }}
                    }}
                  }}
                }}
                """
            else:
                query = f"""
                query {{
                  boards(ids: [{board_id}]) {{
                    items_page(limit: {limit}) {{
                      cursor
                      items {{
                        name
                        column_values {{
                          id
                          text
                        }}
                      }}
                    }}
                  }}
                }}
                """
                
            logger.info(f"Fetching page of items for board: {board_id}")
            response = self._post_with_retry(query)
            res_data = response.json()
            if "errors" in res_data:
                raise Exception(f"Monday API Error: {res_data['errors']}")
                
            boards = res_data.get("data", {}).get("boards", [])
            if not boards:
                break
                
            items_page = boards[0].get("items_page", {})
            page_items = items_page.get("items", [])
            items.extend(page_items)
            
            cursor = items_page.get("cursor")
            has_more = bool(cursor)
            
        logger.info(f"Fetched {len(items)} items from Monday board {board_id}")
        
        # Step 3: Parse items to flat dictionary list
        parsed_rows = []
        for item in items:
            row = {}
            # Use 'name' as default or map it to first column title if relevant
            # In our schemas, Deals has 'Deal Name' and Work Orders has 'Deal name masked'
            # We'll set a generic 'Item Name' or use the 'name' field
            item_name = item.get("name")
            
            # Map column values
            for col_val in item.get("column_values", []):
                col_id = col_val.get("id")
                col_text = col_val.get("text")
                col_title = col_mapping.get(col_id, col_id)
                row[col_title] = col_text
                
            # If the board is Deals, map the item 'name' to 'Deal Name' if 'Deal Name' is not populated
            # If the board is Work Orders, map the item 'name' to 'Deal name masked' if not populated
            if "Deal Name" not in row:
                row["Deal Name"] = item_name
            if "Deal name masked" not in row:
                row["Deal name masked"] = item_name
                
            parsed_rows.append(row)
            
        return pd.DataFrame(parsed_rows)

    def _post_with_retry(self, query: str, retries: int = 3, backoff: float = 1.0) -> httpx.Response:
        client = httpx.Client(timeout=15.0)
        for i in range(retries):
            try:
                response = client.post(self.api_url, json={"query": query}, headers=self.headers)
                if response.status_code == 200:
                    return response
                elif response.status_code == 429: # Rate limit
                    wait_time = backoff * (2 ** i)
                    logger.warning(f"Rate limited (429). Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.warning(f"API request failed with code {response.status_code}. Retrying...")
                    time.sleep(backoff)
            except Exception as e:
                if i == retries - 1:
                    raise e
                time.sleep(backoff * (2 ** i))
        raise Exception("Failed to contact Monday.com API after maximum retries.")

    def get_deals_data(self) -> Tuple[pd.DataFrame, str]:
        """
        Retrieves deals data. Checks cache first.
        Returns: (DataFrame, connection_mode)
        """
        now = time.time()
        # Check cache
        if self._deals_cache is not None and (now - self._deals_cache_time) < CACHE_EXPIRY_SECONDS:
            logger.info("Serving Deals board data from 5-minute memory cache")
            return self._deals_cache, "Live (Cached)"
            
        # Try Live Fetch
        if self.is_live_configured():
            try:
                df = self._fetch_from_monday_api(self.deals_board_id)
                self._deals_cache = df
                self._deals_cache_time = now
                logger.info("Successfully fetched Deals board live from Monday.com API")
                return df, "Live"
            except Exception as e:
                logger.error(f"Failed to fetch live Monday.com deals: {e}. Falling back to prepackaged CSV data.")
                
        # Offline Fallback
        logger.info("Serving prepackaged Deal Funnel dataset (Offline Mode)")
        csv_path = "backend/data/deal_funnel.csv"
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            self._deals_cache = df
            self._deals_cache_time = now
            return df, "Simulated"
        else:
            raise FileNotFoundError("Deals data source not found: neither Monday.com API nor backup CSV are available.")

    def get_work_orders_data(self) -> Tuple[pd.DataFrame, str]:
        """
        Retrieves work orders data. Checks cache first.
        Returns: (DataFrame, connection_mode)
        """
        now = time.time()
        # Check cache
        if self._wo_cache is not None and (now - self._wo_cache_time) < CACHE_EXPIRY_SECONDS:
            logger.info("Serving Work Orders board data from 5-minute memory cache")
            return self._wo_cache, "Live (Cached)"
            
        # Try Live Fetch
        if self.is_live_configured():
            try:
                df = self._fetch_from_monday_api(self.wo_board_id)
                self._wo_cache = df
                self._wo_cache_time = now
                logger.info("Successfully fetched Work Orders board live from Monday.com API")
                return df, "Live"
            except Exception as e:
                logger.error(f"Failed to fetch live Monday.com work orders: {e}. Falling back to prepackaged CSV data.")
                
        # Offline Fallback
        logger.info("Serving prepackaged Work Order Tracker dataset (Offline Mode)")
        csv_path = "backend/data/work_order_tracker.csv"
        if os.path.exists(csv_path):
            # In the raw file, the columns headers start on row 2 (index 1 of CSV)
            # Row 0 contains 'Unnamed' tags.
            # We skip 1 row to parse the headers correctly.
            df = pd.read_csv(csv_path, skiprows=1)
            self._wo_cache = df
            self._wo_cache_time = now
            return df, "Simulated"
        else:
            raise FileNotFoundError("Work orders data source not found: neither Monday.com API nor backup CSV are available.")

    def clear_cache(self):
        """Force cache invalidation"""
        self._deals_cache = None
        self._wo_cache = None
        self._deals_cache_time = 0.0
        self._wo_cache_time = 0.0
        logger.info("Cleared MondayService internal memory cache")
