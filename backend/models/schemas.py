from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ChatQueryRequest(BaseModel):
    query: str = Field(..., description="The natural language query from the executive")
    history: Optional[List[Dict[str, Any]]] = Field(default=[], description="Previous conversation message log")

class WhatIfRequest(BaseModel):
    pending_close_pct: float = Field(0.0, ge=0.0, le=100.0, description="Percentage of open deals that close as Won")
    sector_growth: float = Field(0.0, ge=-100.0, le=100.0, description="Growth percentage of sector revenues")
    delay_reduction: float = Field(0.0, ge=0.0, le=100.0, description="Percentage reduction in delayed work orders")

class BriefRequest(BaseModel):
    brief_type: str = Field("weekly", description="Type of brief: 'daily', 'weekly', or 'monthly'")

class SettingsUpdateRequest(BaseModel):
    monday_api_key: Optional[str] = None
    deals_board_id: Optional[str] = None
    wo_board_id: Optional[str] = None
    gemini_api_key: Optional[str] = None
