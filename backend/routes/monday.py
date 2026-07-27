from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from backend.services.monday_service import MondayService
from backend.cleaning.cleaner import generate_quality_report, clean_deals_df, clean_work_orders_df

router = APIRouter(prefix="/monday", tags=["monday"])
monday_service = MondayService()

@router.get("/status")
def get_connection_status() -> Dict[str, Any]:
    """
    Returns connection statuses (e.g. if we are running in Live or Simulated data mode)
    """
    deals_configured = monday_service.is_live_configured()
    return {
        "is_configured": deals_configured,
        "mode": "Live" if deals_configured else "Simulated",
        "deals_board_id": monday_service.deals_board_id or "Not Configured",
        "work_orders_board_id": monday_service.wo_board_id or "Not Configured"
    }

@router.get("/quality")
def get_data_quality_report() -> Dict[str, Any]:
    """
    Cleans data and returns a structured Data Quality Report
    """
    try:
        deals_raw, deals_mode = monday_service.get_deals_data()
        wo_raw, wo_mode = monday_service.get_work_orders_data()
        
        report = generate_quality_report(deals_raw, wo_raw)
        report["deals_data_source"] = deals_mode
        report["work_orders_data_source"] = wo_mode
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate data quality report: {str(e)}")

@router.post("/clear-cache")
def clear_api_cache() -> Dict[str, str]:
    """
    Invalidates the 5-minute cache to pull fresh data
    """
    try:
        monday_service.clear_cache()
        return {"status": "success", "message": "Cache successfully invalidated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
