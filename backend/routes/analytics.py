from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Tuple
import pandas as pd
from backend.services.monday_service import MondayService
from backend.cleaning.cleaner import clean_deals_df, clean_work_orders_df
from backend.analytics.engine import AnalyticsEngine
from backend.models.schemas import WhatIfRequest

router = APIRouter(prefix="/analytics", tags=["analytics"])
monday_service = MondayService()

def get_cleaned_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    deals_raw, _ = monday_service.get_deals_data()
    wo_raw, _ = monday_service.get_work_orders_data()
    
    deals_clean, _ = clean_deals_df(deals_raw)
    wo_clean, _ = clean_work_orders_df(wo_raw)
    return deals_clean, wo_clean

@router.get("/kpis")
def get_kpis() -> Dict[str, Any]:
    try:
        deals_clean, wo_clean = get_cleaned_data()
        return AnalyticsEngine.get_summary_kpis(deals_clean, wo_clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate KPIs: {str(e)}")

@router.get("/sectors")
def get_sector_data() -> List[Dict[str, Any]]:
    try:
        deals_clean, wo_clean = get_cleaned_data()
        return AnalyticsEngine.get_sector_breakdown(deals_clean, wo_clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends")
def get_trends() -> List[Dict[str, Any]]:
    try:
        deals_clean, _ = get_cleaned_data()
        return AnalyticsEngine.get_revenue_trends(deals_clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/funnel")
def get_funnel() -> List[Dict[str, Any]]:
    try:
        deals_clean, _ = get_cleaned_data()
        return AnalyticsEngine.get_pipeline_funnel(deals_clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-customers")
def get_top_customers() -> List[Dict[str, Any]]:
    try:
        deals_clean, _ = get_cleaned_data()
        return AnalyticsEngine.get_top_customers(deals_clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workload")
def get_workload() -> List[Dict[str, Any]]:
    try:
        _, wo_clean = get_cleaned_data()
        return AnalyticsEngine.get_workload_distribution(wo_clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/what-if")
def simulate_scenario(req: WhatIfRequest) -> Dict[str, Any]:
    try:
        deals_clean, wo_clean = get_cleaned_data()
        return AnalyticsEngine.run_what_if_scenario(
            deals_clean, wo_clean, 
            req.pending_close_pct, 
            req.sector_growth, 
            req.delay_reduction
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
def get_alerts() -> List[Dict[str, Any]]:
    """
    Module 11: Risk Detection & Alerts Center
    - High-value deals nearing close date
    - Large delayed projects
    - Missing owner/revenue
    - Overdue work orders
    """
    try:
        deals_clean, wo_clean = get_cleaned_data()
        alerts = []
        now = pd.Timestamp.now()
        
        # 1. Large delayed projects
        excl_gst_col = 'Amount in Rupees (Excl of GST) (Masked)'
        # Find column in wo_clean matching 'Amount in Rupees (Excl of GST)'
        amount_col = None
        for c in wo_clean.columns:
            if 'amount in rupees (excl' in c.lower():
                amount_col = c
                break
        if not amount_col:
            amount_col = excl_gst_col if excl_gst_col in wo_clean.columns else wo_clean.columns[17] # backup index
            
        delayed_mask = (wo_clean['Execution Status'] == 'Delayed') | \
                       ((wo_clean['Probable End Date'] < now) & (~wo_clean['Execution Status'].isin(['Completed', 'Ongoing/Recurring'])))
        delayed_projects = wo_clean[delayed_mask]
        
        for idx, row in delayed_projects.iterrows():
            val = float(row[amount_col]) if amount_col in row else 0.0
            is_large = val >= 1000000.0
            end_date_str = str(row['Probable End Date'].date()) if pd.notna(row['Probable End Date']) else "N/A"
            alerts.append({
                "id": f"wo-delay-{idx}",
                "type": "Danger" if is_large else "Warning",
                "category": "Operations",
                "title": f"Delayed Project: {row['Deal name masked']}",
                "message": f"Serial {row['Serial #']} is {row['Execution Status']}. End date was {end_date_str}. Value: {val:,.0f} INR.",
                "value": val
            })
            
        # 2. Deals closing soon (within 14 days)
        open_deals = deals_clean[deals_clean['Deal Status'] == 'Open']
        for idx, row in open_deals.iterrows():
            val = float(row['Masked Deal value'])
            close_date = row['Tentative Close Date']
            if pd.notna(close_date):
                days_left = (close_date - now).days
                if 0 <= days_left <= 14:
                    alerts.append({
                        "id": f"deal-soon-{idx}",
                        "type": "Warning" if val < 1000000 else "Danger",
                        "category": "Sales",
                        "title": f"Deal Closing Soon: {row['Deal Name']}",
                        "message": f"Pipeline opportunity value {val:,.0f} INR is set to close in {days_left} days ({str(close_date.date())}).",
                        "value": val
                    })

        # 3. Missing critical data alerts
        missing_owner_deals = deals_clean[deals_clean['Owner code'] == 'Unassigned']
        if len(missing_owner_deals) > 0:
            alerts.append({
                "id": "missing-owners",
                "type": "Info",
                "category": "Data Quality",
                "title": "Unassigned Deal Owners",
                "message": f"{len(missing_owner_deals)} open deals are currently unassigned to any owner code in Monday.com.",
                "value": 0.0
            })
            
        missing_val_deals = deals_clean[deals_clean['Masked Deal value'] == 0.0]
        if len(missing_val_deals) > 0:
            alerts.append({
                "id": "missing-values",
                "type": "Warning",
                "category": "Data Quality",
                "title": "Zero Value Opportunities",
                "message": f"{len(missing_val_deals)} deals are listed with a 0.0 INR pipeline value.",
                "value": 0.0
            })
            
        # Sort by urgency (Danger first, then Warning, then Info)
        priority_map = {"Danger": 3, "Warning": 2, "Info": 1}
        alerts.sort(key=lambda x: priority_map.get(x["type"], 0), reverse=True)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timeline")
def get_decision_timeline() -> List[Dict[str, Any]]:
    """
    Bonus Feature: Decision Timeline
    Extracts key timeline events sorted chronologically
    """
    try:
        deals_clean, wo_clean = get_cleaned_data()
        events = []
        
        # 1. Deals Won Events
        won_deals = deals_clean[deals_clean['Deal Status'] == 'Won']
        for idx, row in won_deals.iterrows():
            dt = row['Close Date (A)']
            if pd.isna(dt):
                dt = row['Created Date']
            if pd.notna(dt):
                events.append({
                    "date": str(dt.date()),
                    "timestamp": dt,
                    "event_type": "Deal Won",
                    "title": f"Deal Won: {row['Deal Name']}",
                    "description": f"Client {row['Client Code']} closed a deal in {row['Sector/service']} valued at {float(row['Masked Deal value']):,.0f} INR.",
                    "tag": "Sales"
                })
                
        # 2. Project Commencements (PO/LOI Date)
        for idx, row in wo_clean.iterrows():
            po_date = row['Date of PO/LOI']
            if pd.notna(po_date):
                events.append({
                    "date": str(po_date.date()),
                    "timestamp": po_date,
                    "event_type": "Project Authorized",
                    "title": f"Project Authorized: {row['Deal name masked']}",
                    "description": f"Purchase Order signed for serial {row['Serial #']} in {row['Sector']}. Status: {row['Execution Status']}.",
                    "tag": "Operations"
                })
                
        # 3. Deliveries (Data Delivery Date)
        completed_wo = wo_clean[wo_clean['Execution Status'] == 'Completed']
        for idx, row in completed_wo.iterrows():
            delivery_date = row['Data Delivery Date']
            if pd.notna(delivery_date):
                events.append({
                    "date": str(delivery_date.date()),
                    "timestamp": delivery_date,
                    "event_type": "Project Delivered",
                    "title": f"Deliverable Completed: {row['Deal name masked']}",
                    "description": f"Data delivery finalized for project serial {row['Serial #']} in {row['Sector']}.",
                    "tag": "Delivery"
                })
                
        # Sort events by timestamp descending
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        # Drop timestamps from return format
        for ev in events:
            del ev["timestamp"]
            
        return events[:20] # Return top 20 events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insight-of-the-day")
def get_insight_of_the_day() -> Dict[str, str]:
    """
    Bonus Feature: Generates one high-value business insight based on current data
    """
    try:
        deals_clean, wo_clean = get_cleaned_data()
        
        # Calculate sector performance
        sectors = AnalyticsEngine.get_sector_breakdown(deals_clean, wo_clean)
        if not sectors:
            return {"insight": "Data pipelines are loaded. Complete details on sales deals to generate target insights."}
            
        # Convert to dataframe for queries
        df_sec = pd.DataFrame(sectors)
        
        # Case 1: Bottleneck sector
        bottlenecks = df_sec[df_sec['is_bottleneck'] == True]
        if not bottlenecks.empty:
            # Get the highest revenue bottleneck
            top_bn = bottlenecks.sort_values('won_revenue', ascending=False).iloc[0]
            pct_delays = top_bn['delay_rate']
            pct_rev = (top_bn['won_revenue'] / df_sec['won_revenue'].sum() * 100.0) if df_sec['won_revenue'].sum() > 0 else 0
            return {
                "insight": f"{top_bn['Sector']} contributes {pct_rev:.1f}% of our total won revenue, but exhibits a significant project delay rate of {pct_delays:.1f}%. Consider shifting engineering staff to clear this delivery bottleneck."
            }
            
        # Case 2: Top performer
        top_sec = df_sec.sort_values('won_revenue', ascending=False).iloc[0]
        pct_rev = (top_sec['won_revenue'] / df_sec['won_revenue'].sum() * 100.0) if df_sec['won_revenue'].sum() > 0 else 0
        return {
            "insight": f"{top_sec['Sector']} is our strongest vertical this quarter, representing {pct_rev:.1f}% of won revenue with a {top_sec['completion_rate']}% delivery completion rate."
        }
    except Exception as e:
        return {"insight": f"Analysis engine active. Monitoring ongoing pipeline integrations. ({str(e)})"}
