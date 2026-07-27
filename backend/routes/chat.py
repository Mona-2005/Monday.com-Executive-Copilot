from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Tuple
import pandas as pd
from backend.services.monday_service import MondayService
from backend.services.gemini_service import GeminiService
from backend.cleaning.cleaner import clean_deals_df, clean_work_orders_df, generate_quality_report
from backend.analytics.engine import AnalyticsEngine
from backend.models.schemas import ChatQueryRequest

router = APIRouter(prefix="/chat", tags=["chat"])
monday_service = MondayService()
gemini_service = GeminiService()

def get_cleaned_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    deals_raw, _ = monday_service.get_deals_data()
    wo_raw, _ = monday_service.get_work_orders_data()
    deals_clean, _ = clean_deals_df(deals_raw)
    wo_clean, _ = clean_work_orders_df(wo_raw)
    return deals_clean, wo_clean

@router.post("/query")
def process_chat_query(req: ChatQueryRequest) -> Dict[str, Any]:
    """
    Module 3 & 6: Main Chat Query endpoint. Parses intent,
    runs Pandas calculations, feeds facts to Gemini, returns markdown response.
    """
    try:
        deals_clean, wo_clean = get_cleaned_data()
        
        # 1. Parse intent
        classification = gemini_service.classify_query(req.query)
        
        # If ambiguous, return clarification immediately
        if classification.get("is_ambiguous", False):
            return {
                "response": classification.get("clarification_question"),
                "intent": classification.get("intent", "general_chat"),
                "entities": [],
                "confidence": 100.0,
                "suggested_questions": [
                    "How is our pipeline?",
                    "Show delayed projects",
                    "Sector revenue breakdown"
                ],
                "ai_mode": gemini_service.get_ai_mode(),
                "is_clarification": True
            }
            
        intent = classification.get("intent", "general_chat")
        entities = classification.get("entities", [])
        
        # 2. Gather Pandas Stats based on Intent
        summary_kpis = AnalyticsEngine.get_summary_kpis(deals_clean, wo_clean)
        
        # Build deterministic context text
        context_lines = []
        context_lines.append(f"Total Won Revenue: {summary_kpis['won_revenue']:,.2f} INR")
        context_lines.append(f"Total Pipeline: {summary_kpis['pipeline']:,.2f} INR")
        context_lines.append(f"Sales Conversion Rate: {summary_kpis['conversion_rate']}%")
        context_lines.append(f"Project Completion Rate: {summary_kpis['completion_rate']}%")
        context_lines.append(f"Delayed Projects Count: {summary_kpis['delayed_work_orders']}")
        context_lines.append(f"Stale Deals Count: {summary_kpis['stale_deals']}")
        
        # Filter details if entities (sectors) are mentioned
        if entities:
            context_lines.append(f"\nFiltered Sectors mentioned: {', '.join(entities)}")
            sectors = AnalyticsEngine.get_sector_breakdown(deals_clean, wo_clean)
            for s in sectors:
                if s["Sector"] in entities:
                    context_lines.append(
                        f"Sector: {s['Sector']} -> Won Revenue: {s['won_revenue']:,.0f} INR, "
                        f"Pipeline: {s['pipeline']:,.0f} INR, Work Orders Count: {s['wo_count']}, "
                        f"Completion Rate: {s['completion_rate']}%, Delayed Orders: {s['delayed_wo']}, "
                        f"Is Bottleneck: {s['is_bottleneck']}"
                    )
        elif intent == "sector_performance":
            sectors = AnalyticsEngine.get_sector_breakdown(deals_clean, wo_clean)
            context_lines.append("\nAll Sector Performance details:")
            for s in sectors:
                context_lines.append(
                    f"Sector: {s['Sector']} -> Won Revenue: {s['won_revenue']:,.0f} INR, "
                    f"Pipeline: {s['pipeline']:,.0f} INR, Completion Rate: {s['completion_rate']}%, "
                    f"Delayed Orders: {s['delayed_wo']}, Is Bottleneck: {s['is_bottleneck']}"
                )
        elif intent == "operational_delays":
            # Add specific details about delayed projects
            delayed_mask = (wo_clean['Execution Status'] == 'Delayed') | \
                           ((wo_clean['Probable End Date'] < pd.Timestamp.now()) & (wo_clean['Execution Status'] != 'Completed'))
            delayed_wo = wo_clean[delayed_mask]
            context_lines.append("\nDelayed Work Orders details:")
            for idx, row in delayed_wo.head(5).iterrows():
                context_lines.append(
                    f"- Serial: {row['Serial #']}, Project: {row['Deal name masked']}, "
                    f"Sector: {row['Sector']}, Status: {row['Execution Status']}, End Date: {str(row['Probable End Date'].date()) if pd.notna(row['Probable End Date']) else 'N/A'}"
                )
            if len(delayed_wo) > 5:
                context_lines.append(f"... and {len(delayed_wo) - 5} more delayed work orders.")
                
        elif intent == "risk_alerts":
            # Add specific alerts context
            stale_deals_mask = (deals_clean['Deal Status'] == 'Open') & \
                               ((deals_clean['Tentative Close Date'] < pd.Timestamp.now()) | 
                                ((pd.Timestamp.now() - deals_clean['Created Date']).dt.days > 180))
            stale_deals = deals_clean[stale_deals_mask]
            context_lines.append("\nStale Pipeline Deals details (top 5):")
            for idx, row in stale_deals.head(5).iterrows():
                context_lines.append(
                    f"- Deal: {row['Deal Name']}, Sector: {row['Sector/service']}, Value: {float(row['Masked Deal value']):,.0f} INR, Created: {str(row['Created Date'].date())}"
                )
                
        # 3. Calculate Confidence Score based on Data Quality
        # We fetch the data quality score and use it directly. E.g. 94%
        quality_report = generate_quality_report(deals_clean, wo_clean)
        confidence = quality_report.get("overall_score", 95.0)
        
        # 4. Generate Gemini response
        context_str = "\n".join(context_lines)
        ai_response = gemini_service.generate_response(req.query, context_str, confidence)
        
        # 5. Suggested follow ups
        suggested_questions = gemini_service.generate_suggested_questions(intent)
        
        return {
            "response": ai_response,
            "intent": intent,
            "entities": entities,
            "confidence": confidence,
            "suggested_questions": suggested_questions,
            "ai_mode": gemini_service.get_ai_mode(),
            "is_clarification": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Copilot encountered an error processing query: {str(e)}")
