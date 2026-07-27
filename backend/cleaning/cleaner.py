import pandas as pd
import numpy as np
import re
from typing import Dict, Any, Tuple, List

def clean_date(val: Any) -> Any:
    if pd.isna(val):
        return pd.NaT
    val_str = str(val).strip()
    if val_str.lower() in ["nan", "null", "none", "", "nat"]:
        return pd.NaT
    # Try parsing
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return pd.to_datetime(val_str, format=fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(val_str, errors='coerce')
    except Exception:
        return pd.NaT

def clean_numeric(val: Any) -> float:
    if pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip()
    # Strip currency symbols and commas
    val_str = re.sub(r'[^\d\.\-]', '', val_str)
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def normalize_sector(val: Any) -> str:
    if pd.isna(val):
        return "Others"
    val_str = str(val).strip()
    if val_str.lower() in ["nan", "null", "", "others", "other"]:
        return "Others"
    
    # Casing map
    sector_map = {
        "mining": "Mining",
        "powerline": "Powerline",
        "renewables": "Renewables",
        "railways": "Railways",
        "construction": "Construction",
        "tender": "Tender",
        "dsp": "DSP",
        "aviation": "Aviation",
        "manufacturing": "Manufacturing",
        "security and surveillance": "Security & Surveillance",
        "security & surveillance": "Security & Surveillance"
    }
    
    normalized = sector_map.get(val_str.lower())
    if normalized:
        return normalized
    
    # Capitalize first letter of each word
    return val_str.title()

def clean_deals_df(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    # Copy to avoid modifying original
    df = df.copy()
    
    # Track raw shape and info
    total_raw = len(df)
    
    # Column mapping helper to handle difference between CSV and Live Monday API column titles
    all_cols = df.columns.tolist()
    
    def find_col(possible_names: List[str], default: str) -> str:
        for p in possible_names:
            for c in all_cols:
                if p.lower() in str(c).lower():
                    return c
        return default

    deal_name_col = find_col(['deal name', 'name', 'item name'], 'Deal Name')
    owner_col = find_col(['owner code', 'deal owner', 'owner'], 'Owner code')
    client_col = find_col(['client code', 'contact person', 'contact', 'client'], 'Client Code')
    status_col = find_col(['deal status', 'status'], 'Deal Status')
    stage_col = find_col(['deal stage', 'stage', 'priority'], 'Deal Stage')
    sector_col = find_col(['sector/service', 'sector', 'service'], 'Sector/service')
    value_col = find_col(['masked deal value', 'deal value', 'value', 'amount'], 'Masked Deal value')
    created_col = find_col(['created date', 'date created', 'created'], 'Created Date')
    close_col = find_col(['close date (a)', 'close date', 'closed'], 'Close Date (A)')
    tentative_col = find_col(['tentative close date', 'tentative'], 'Tentative Close Date')

    # Drop rows that are headers
    if deal_name_col in df.columns:
        header_rows = df[df[deal_name_col] == deal_name_col].index
        df = df.drop(header_rows)
    else:
        header_rows = []
    
    # Ensure standardized column names on output dataframe
    df['Deal Name'] = df[deal_name_col].fillna("Unknown Deal").astype(str).str.strip() if deal_name_col in df.columns else "Unknown Deal"
    df['Owner code'] = df[owner_col].fillna("Unassigned").astype(str).str.strip() if owner_col in df.columns else "Unassigned"
    df['Client Code'] = df[client_col].fillna("Unknown Client").astype(str).str.strip() if client_col in df.columns else "Unknown Client"
    df['Deal Status'] = df[status_col].fillna("Open").astype(str).str.strip().str.title() if status_col in df.columns else "Open"
    df['Deal Stage'] = df[stage_col].fillna("New").astype(str).str.strip() if stage_col in df.columns else "New"
    
    # Clean Sector
    df['Sector/service'] = df[sector_col].apply(normalize_sector) if sector_col in df.columns else "Others"
    
    # Clean Numeric
    df['Masked Deal value'] = df[value_col].apply(clean_numeric) if value_col in df.columns else 0.0
    
    # Clean Dates
    df['Created Date'] = df[created_col].apply(clean_date) if created_col in df.columns else pd.NaT
    df['Close Date (A)'] = df[close_col].apply(clean_date) if close_col in df.columns else pd.NaT
    df['Tentative Close Date'] = df[tentative_col].apply(clean_date) if tentative_col in df.columns else pd.NaT
    
    # Standardize statuses
    def norm_deal_status(val: str) -> str:
        v_low = str(val).lower()
        if "won" in v_low:
            return "Won"
        if "lost" in v_low or "closed" in v_low:
            return "Lost"
        return "Open"
        
    df['Deal Status'] = df['Deal Status'].apply(norm_deal_status)
    
    # Identify duplicates
    duplicates_count = int(df.duplicated(subset=['Deal Name', 'Client Code', 'Masked Deal value']).sum())
    # Drop duplicates to keep clean data consistent
    df = df.drop_duplicates(subset=['Deal Name', 'Client Code', 'Masked Deal value'])
    
    # Null and quality calculations
    null_deal_values = int(df['Masked Deal value'].eq(0.0).sum())
    null_sectors = int(df['Sector/service'].eq("Others").sum())
    null_close_dates = int(df['Close Date (A)'].isna().sum())
    
    metrics = {
        "total_records": len(df),
        "removed_headers": len(header_rows),
        "duplicates_removed": duplicates_count,
        "null_deal_values": null_deal_values,
        "null_sectors": null_sectors,
        "null_close_dates": null_close_dates,
        "quality_score": max(0.0, 100.0 - (duplicates_count * 1.5 + null_deal_values * 1.0 + null_sectors * 0.5) / max(1, len(df)) * 100.0)
    }
    
    return df, metrics

def clean_work_orders_df(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    df = df.copy()
    
    # Drop rows that are headers
    header_rows = df[df['Deal name masked'] == 'Deal name masked'].index
    df = df.drop(header_rows)
    
    # Basic fills
    df['Deal name masked'] = df['Deal name masked'].fillna("Unknown Deal").astype(str).str.strip()
    df['Customer Name Code'] = df['Customer Name Code'].fillna("Unknown Customer").astype(str).str.strip()
    df['Serial #'] = df['Serial #'].fillna("Unknown Serial").astype(str).str.strip()
    df['Nature of Work'] = df['Nature of Work'].fillna("One time Project").astype(str).str.strip()
    
    # Clean numeric
    excl_gst_col = 'Amount in Rupees (Excl of GST) (Masked)'
    incl_gst_col = 'Amount in Rupees (Incl of GST) (Masked)'
    billed_excl_col = 'Billed Value in Rupees (Excl of GST.) (Masked)'
    receivable_col = 'Amount Receivable (Masked)'
    
    # Verify exact column existence
    all_cols = df.columns.tolist()
    
    # Define mapping helpers for weird column headers in the spreadsheet
    col_mapping = {}
    for c in all_cols:
        cleaned_c = re.sub(r'\s+', ' ', c).strip()
        col_mapping[cleaned_c] = c
        
    def get_col_by_approx(name: str, default: str) -> str:
        for c_clean, c_orig in col_mapping.items():
            if name.lower() in c_clean.lower():
                return c_orig
        return default
        
    excl_gst_real = get_col_by_approx('Amount in Rupees (Excl of GST)', excl_gst_col)
    incl_gst_real = get_col_by_approx('Amount in Rupees (Incl of GST)', incl_gst_col)
    billed_real = get_col_by_approx('Billed Value in Rupees (Excl of GST', billed_excl_col)
    receivable_real = get_col_by_approx('Amount Receivable', receivable_col)
    
    df[excl_gst_real] = df[excl_gst_real].apply(clean_numeric)
    df[incl_gst_real] = df[incl_gst_real].apply(clean_numeric)
    df[billed_real] = df[billed_real].apply(clean_numeric)
    df[receivable_real] = df[receivable_real].apply(clean_numeric)
    
    # Clean execution status
    df['Execution Status'] = df['Execution Status'].fillna("Not Started").astype(str).str.strip()
    status_normalization = {
        "completed": "Completed",
        "not started": "Not Started",
        "in progress": "In Progress",
        "on hold": "On Hold",
        "delayed": "Delayed",
        "cancelled": "Cancelled",
        "executed until current month": "Ongoing/Recurring",
        "executed": "Completed",
        "under execution": "In Progress"
    }
    
    def norm_exec_status(status: str) -> str:
        s_low = status.lower()
        for key, val in status_normalization.items():
            if key in s_low:
                return val
        return "In Progress" # default fallback
        
    df['Execution Status'] = df['Execution Status'].apply(norm_exec_status)
    
    # Clean Sector
    df['Sector'] = df['Sector'].apply(normalize_sector)
    
    # Clean dates
    df['Probable Start Date'] = df['Probable Start Date'].apply(clean_date)
    df['Probable End Date'] = df['Probable End Date'].apply(clean_date)
    df['Data Delivery Date'] = df['Data Delivery Date'].apply(clean_date)
    df['Date of PO/LOI'] = df['Date of PO/LOI'].apply(clean_date)
    
    # Detect duplicates
    duplicates_count = int(df.duplicated(subset=['Deal name masked', 'Serial #', excl_gst_real]).sum())
    df = df.drop_duplicates(subset=['Deal name masked', 'Serial #', excl_gst_real])
    
    null_values = int(df[excl_gst_real].eq(0.0).sum())
    null_dates = int(df['Probable End Date'].isna().sum())
    null_sectors = int(df['Sector'].eq("Others").sum())
    
    metrics = {
        "total_records": len(df),
        "removed_headers": len(header_rows),
        "duplicates_removed": duplicates_count,
        "null_order_values": null_values,
        "null_sectors": null_sectors,
        "null_end_dates": null_dates,
        "quality_score": max(0.0, 100.0 - (duplicates_count * 2.0 + null_values * 1.0 + null_dates * 0.8 + null_sectors * 0.5) / max(1, len(df)) * 100.0)
    }
    
    return df, metrics

def generate_quality_report(deals_raw: pd.DataFrame, wo_raw: pd.DataFrame) -> Dict[str, Any]:
    # We do a dry-run or process to get clean data and metrics
    try:
        deals_clean, deals_metrics = clean_deals_df(deals_raw)
    except Exception as e:
        deals_clean, deals_metrics = deals_raw, {"total_records": len(deals_raw), "quality_score": 0.0, "error": str(e)}
        
    try:
        wo_clean, wo_metrics = clean_work_orders_df(wo_raw)
    except Exception as e:
        wo_clean, wo_metrics = wo_raw, {"total_records": len(wo_raw), "quality_score": 0.0, "error": str(e)}
        
    overall_score = (deals_metrics.get("quality_score", 100.0) + wo_metrics.get("quality_score", 100.0)) / 2.0
    
    # Compile critical anomalies
    anomalies = []
    recommendations = []
    
    # Deals anomalies
    if deals_metrics.get("duplicates_removed", 0) > 0:
        anomalies.append(f"Deals Board: Found and removed {deals_metrics['duplicates_removed']} duplicate deal entries.")
        recommendations.append("Enforce validation in Monday.com to prevent double entry of duplicate deals.")
        
    if deals_metrics.get("null_deal_values", 0) > 0:
        anomalies.append(f"Deals Board: {deals_metrics['null_deal_values']} deals have a missing or zero deal value.")
        recommendations.append("Require Sales representatives to fill out the 'Masked Deal value' before moving to Proposal/Commercial stage.")
        
    if deals_metrics.get("null_sectors", 0) > 0:
        anomalies.append(f"Deals Board: {deals_metrics['null_sectors']} deals are unassigned to a business sector (classified as 'Others').")
        recommendations.append("Standardize the 'Sector/service' dropdown in Monday.com and make it a mandatory field.")
        
    # Work orders anomalies
    if wo_metrics.get("duplicates_removed", 0) > 0:
        anomalies.append(f"Work Orders Board: Found and removed {wo_metrics['duplicates_removed']} duplicate project entries.")
        recommendations.append("Clean up recurring work orders that are logged twice under the same serial number.")
        
    if wo_metrics.get("null_order_values", 0) > 0:
        anomalies.append(f"Work Orders Board: {wo_metrics['null_order_values']} work orders have a value of 0.0 Rupees.")
        recommendations.append("Cross-reference zero-value work orders with PO documents to update billing details.")
        
    if wo_metrics.get("null_end_dates", 0) > 0:
        anomalies.append(f"Work Orders Board: {wo_metrics['null_end_dates']} projects are missing End/Delivery dates.")
        recommendations.append("Set tentative delivery end dates for all In-Progress projects to enable schedule tracking.")

    # Quality classification
    if overall_score >= 90:
        grade = "Good"
        description = "The data is highly complete and structured. Safe for automated forecasting."
    elif overall_score >= 75:
        grade = "Fair"
        description = "Minor gaps detected (missing dates or duplicate records). Analytics are reliable but watch for unassigned sectors."
    else:
        grade = "Poor"
        description = "Significant missing revenue fields or duplicate lines. Data cleansing mapping was heavily applied. Manual audit recommended."

    return {
        "overall_score": round(overall_score, 1),
        "grade": grade,
        "description": description,
        "deals_metrics": deals_metrics,
        "wo_metrics": wo_metrics,
        "anomalies": anomalies,
        "recommendations": recommendations
    }
