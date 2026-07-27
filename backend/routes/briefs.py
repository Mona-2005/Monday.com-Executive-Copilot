from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Tuple
import pandas as pd
from backend.services.monday_service import MondayService
from backend.services.gemini_service import GeminiService
from backend.cleaning.cleaner import clean_deals_df, clean_work_orders_df
from backend.analytics.engine import AnalyticsEngine
from backend.models.schemas import BriefRequest

router = APIRouter(prefix="/briefs", tags=["briefs"])
monday_service = MondayService()
gemini_service = GeminiService()

def get_cleaned_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    deals_raw, _ = monday_service.get_deals_data()
    wo_raw, _ = monday_service.get_work_orders_data()
    deals_clean, _ = clean_deals_df(deals_raw)
    wo_clean, _ = clean_work_orders_df(wo_raw)
    return deals_clean, wo_clean

@router.post("/generate")
def generate_leadership_brief(req: BriefRequest) -> Dict[str, str]:
    """
    Module 12 & 13: One-click Executive Leadership Brief and Update generator.
    """
    try:
        deals_clean, wo_clean = get_cleaned_data()
        
        # Calculate dashboard metrics
        stats = AnalyticsEngine.get_summary_kpis(deals_clean, wo_clean)
        
        # Sector breakdown
        sectors = AnalyticsEngine.get_sector_breakdown(deals_clean, wo_clean)
        
        # Build sector table string
        sec_lines = [
            "| Sector | Won Revenue (INR) | Open Pipeline (INR) | Deliveries (Completed / Total) | Completion % | Delayed % | Bottleneck? |",
            "|---|---|---|---|---|---|---|--"
        ]
        for s in sectors:
            sec_lines.append(
                f"| {s['Sector']} | {s['won_revenue']:,.0f} | {s['pipeline']:,.0f} | {s['completed_wo']} / {s['wo_count']} | {s['completion_rate']}% | {s['delay_rate']}% | {'⚠️ YES' if s['is_bottleneck'] else '✅ NO'} |"
            )
        sector_breakdown_str = "\n".join(sec_lines)
        
        # Call Gemini report generation
        report_md = gemini_service.generate_leadership_report(
            req.brief_type.title(), 
            stats, 
            sector_breakdown_str
        )
        
        return {"report": report_md}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate brief: {str(e)}")
