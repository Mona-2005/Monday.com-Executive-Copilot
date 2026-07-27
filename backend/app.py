import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Import routes and services
from backend.routes import monday, analytics, chat, briefs
from backend.models.schemas import SettingsUpdateRequest

# Load env variables
load_dotenv(override=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Monday.com Executive Copilot API",
    description="Business Intelligence and decision support backend API.",
    version="1.0.0"
)

# CORS Middleware for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(monday.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(briefs.router, prefix="/api")

# Settings endpoints for dynamic workspace config
@app.get("/api/settings")
def get_settings():
    """
    Returns current configuration keys (masked for security)
    """
    return {
        "monday_api_key_set": bool(os.getenv("MONDAY_API_KEY")),
        "deals_board_id": os.getenv("MONDAY_DEALS_BOARD_ID", ""),
        "work_orders_board_id": os.getenv("MONDAY_WORK_ORDERS_BOARD_ID", ""),
        "gemini_api_key_set": bool(os.getenv("GEMINI_API_KEY")),
        "connection_mode": "Live" if (os.getenv("MONDAY_API_KEY") and os.getenv("MONDAY_DEALS_BOARD_ID")) else "Simulated",
        "ai_mode": "Live" if os.getenv("GEMINI_API_KEY") else "Simulated"
    }

@app.post("/api/settings/update")
def update_settings(req: SettingsUpdateRequest):
    """
    Updates env keys dynamically. Writes them to the .env file, reloads os.environ,
    and forces the services to re-evaluate their API configs.
    """
    try:
        env_updates = {}
        if req.monday_api_key is not None:
            env_updates["MONDAY_API_KEY"] = req.monday_api_key
        if req.deals_board_id is not None:
            env_updates["MONDAY_DEALS_BOARD_ID"] = req.deals_board_id
        if req.work_orders_board_id is not None:
            env_updates["MONDAY_WORK_ORDERS_BOARD_ID"] = req.work_orders_board_id
        if req.gemini_api_key is not None:
            env_updates["GEMINI_API_KEY"] = req.gemini_api_key
            
        # Update process variables
        for key, val in env_updates.items():
            os.environ[key] = val
            
        # Rewrite or update .env file on disk
        env_lines = []
        existing_keys = set()
        
        # Read current .env if exists
        env_path = ".env"
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        if k in env_updates:
                            env_lines.append(f"{k}={env_updates[k]}\n")
                            existing_keys.add(k)
                        else:
                            env_lines.append(line)
                    else:
                        env_lines.append(line)
                        
        # Append new keys
        for key, val in env_updates.items():
            if key not in existing_keys:
                env_lines.append(f"{key}={val}\n")
                
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(env_lines)
            
        # Re-initialize service instances dynamically to reflect changes
        # This re-creates global service singletons on next imports/calls
        monday.monday_service.__init__()
        analytics.monday_service.__init__()
        chat.monday_service.__init__()
        chat.gemini_service.__init__()
        briefs.monday_service.__init__()
        briefs.gemini_service.__init__()
        
        logger.info("Env updated and service clients re-initialized.")
        return {"status": "success", "message": "Settings updated. Services re-initialized."}
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount Frontend static files compiled by Vite
# We assume frontend compiles into 'backend/static'
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    # Mount assets folder for bundle styles & scripts
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")
        
    @app.get("/{catchall:path}")
    def catch_all(catchall: str):
        # Check if the requested file exists in the static folder
        file_path = os.path.join(static_dir, catchall)
        if os.path.isfile(file_path) and not catchall.startswith("api/"):
            return FileResponse(file_path)
            
        # Otherwise serve index.html for Single Page App routing
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        return {"message": "Monday.com Executive Copilot Backend API is running. Build frontend to view interface."}
else:
    @app.get("/")
    def root():
        return {"message": "Monday.com Executive Copilot Backend API is running. static/ folder not found. Compile frontend."}

if __name__ == "__main__":
    import uvicorn
    # Start server
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
