import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from datetime import datetime
import re

class AnalyticsEngine:
    @staticmethod
    def get_summary_kpis(deals_df: pd.DataFrame, wo_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculates all summary cards for the dashboard.
        """
        # Deals metrics
        won_deals = deals_df[deals_df['Deal Status'] == 'Won']
        lost_deals = deals_df[deals_df['Deal Status'] == 'Lost']
        open_deals = deals_df[deals_df['Deal Status'] == 'Open']
        
        total_won_rev = float(won_deals['Masked Deal value'].sum())
        total_pipeline = float(open_deals['Masked Deal value'].sum())
        
        closed_count = len(won_deals) + len(lost_deals)
        conversion_rate = (len(won_deals) / closed_count * 100.0) if closed_count > 0 else 0.0
        avg_deal_size = float(deals_df['Masked Deal value'].mean()) if len(deals_df) > 0 else 0.0
        
        # Work orders metrics
        total_orders = len(wo_df)
        completed_orders = len(wo_df[wo_df['Execution Status'] == 'Completed'])
        completion_rate = (completed_orders / total_orders * 100.0) if total_orders > 0 else 0.0
        
        # Delayed Work Orders
        # A work order is delayed if Execution Status is 'Delayed', or if its Probable End Date is in the past and it is not Completed
        now = pd.Timestamp.now()
        delayed_orders_mask = (wo_df['Execution Status'] == 'Delayed') | \
                              ((wo_df['Probable End Date'] < now) & (~wo_df['Execution Status'].isin(['Completed', 'Ongoing/Recurring'])))
        delayed_orders = wo_df[delayed_orders_mask]
        delayed_count = len(delayed_orders)
        
        # Stale Deals
        # Open deals that are past tentative close date or older than 180 days
        stale_deals_mask = (deals_df['Deal Status'] == 'Open') & \
                           ((deals_df['Tentative Close Date'] < now) | 
                            ((now - deals_df['Created Date']).dt.days > 180))
        stale_deals_count = int(stale_deals_mask.sum())
        
        # Scores
        health_score, health_reasons = AnalyticsEngine.calculate_health_score(
            conversion_rate, completion_rate, delayed_count, total_orders, total_won_rev, stale_deals_count
        )
        risk_score, risk_reasons = AnalyticsEngine.calculate_risk_score(
            delayed_count, total_orders, stale_deals_count, len(open_deals), total_won_rev
        )
        
        return {
            "won_revenue": round(total_won_rev, 2),
            "pipeline": round(total_pipeline, 2),
            "conversion_rate": round(conversion_rate, 1),
            "average_deal_size": round(avg_deal_size, 2),
            "completion_rate": round(completion_rate, 1),
            "delayed_work_orders": delayed_count,
            "stale_deals": stale_deals_count,
            "business_health_score": health_score,
            "business_health_explanation": health_reasons,
            "risk_score": risk_score,
            "risk_explanation": risk_reasons,
            "total_deals_count": len(deals_df),
            "total_work_orders_count": total_orders
        }

    @staticmethod
    def calculate_health_score(conversion: float, completion: float, delayed: int, 
                               total_wo: int, revenue: float, stale_deals: int) -> Tuple[int, str]:
        """
        Determines business health score (0-100) and supplies an explanation.
        """
        score = 100.0
        deductions = []
        
        # Conversion deduction (Target conversion: 35%)
        if conversion < 35.0:
            diff = 35.0 - conversion
            deduct = min(15.0, diff * 0.5)
            score -= deduct
            deductions.append(f"Low sales conversion rate of {conversion:.1f}% (target 35%) (-{deduct:.1f} pts)")
            
        # Completion deduction (Target completion: 80%)
        if completion < 80.0:
            diff = 80.0 - completion
            deduct = min(20.0, diff * 0.6)
            score -= deduct
            deductions.append(f"Operational execution completion rate of {completion:.1f}% is below target (-{deduct:.1f} pts)")
            
        # Delayed projects deduction
        if total_wo > 0:
            delay_pct = (delayed / total_wo) * 100.0
            if delay_pct > 10.0:
                deduct = min(15.0, (delay_pct - 10.0) * 0.5)
                score -= deduct
                deductions.append(f"High ratio of delayed work orders ({delay_pct:.1f}%) (-{deduct:.1f} pts)")
                
        # Stale deals deduction
        if stale_deals > 0:
            deduct = min(10.0, stale_deals * 0.5)
            score -= deduct
            deductions.append(f"{stale_deals} stale pipeline deals showing lack of sales movement (-{deduct:.1f} pts)")
            
        final_score = int(max(0, min(100, round(score))))
        
        if final_score >= 85:
            desc = "Strong Business Health. Sales pipeline converting efficiently, and project delivery schedules are well-maintained."
        elif final_score >= 70:
            desc = "Moderate Business Health. Solid baseline revenue, but performance is pinched by delivery delays or sales stalling."
        else:
            desc = "At-Risk Business Health. Immediate attention required: low pipeline conversion rate coupled with high operational project delays."
            
        reasons_summary = " ".join(deductions) if deductions else "All metrics are performing at or above targets."
        full_explanation = f"{desc} {reasons_summary}"
        
        return final_score, full_explanation

    @staticmethod
    def calculate_risk_score(delayed: int, total_wo: int, stale_deals: int, open_deals: int, revenue: float) -> Tuple[int, str]:
        """
        Determines operational and pipeline risk (0-100) and supplies an explanation.
        """
        risk = 0.0
        reasons = []
        
        # Operational delays
        if total_wo > 0:
            delay_pct = (delayed / total_wo) * 100.0
            if delay_pct > 15.0:
                add = min(40.0, delay_pct * 0.8)
                risk += add
                reasons.append(f"High project delay rate of {delay_pct:.1f}% increases delivery risk (+{add:.1f} pts)")
            elif delay_pct > 0:
                risk += 10.0
                reasons.append(f"Minor project delays present in active work orders (+10 pts)")
        
        # Pipeline stagnation
        if open_deals > 0:
            stale_pct = (stale_deals / open_deals) * 100.0
            if stale_pct > 30.0:
                add = min(30.0, stale_pct * 0.4)
                risk += add
                reasons.append(f"Pipeline stagnation: {stale_pct:.1f}% of open deals are stale (+{add:.1f} pts)")
                
        # Revenue concentration or size risk
        if revenue == 0:
            risk += 20.0
            reasons.append("No recorded won revenue in data set (+20 pts)")
            
        final_score = int(max(0, min(100, round(risk))))
        
        if final_score >= 60:
            desc = "High Exposure Risk. Operational execution bottlenecks and sales stagnation could lead to client churn or revenue shortfalls."
        elif final_score >= 30:
            desc = "Medium Exposure Risk. Pipeline is healthy, but minor delays in projects warrant monitoring to prevent SLA breaches."
        else:
            desc = "Low Exposure Risk. Smooth execution pipelines and healthy sales velocity."
            
        reasons_summary = " ".join(reasons) if reasons else "No significant risks identified."
        full_explanation = f"{desc} {reasons_summary}"
        
        return final_score, full_explanation

    @staticmethod
    def get_sector_breakdown(deals_df: pd.DataFrame, wo_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Cross-Board Intelligence Engine.
        Groups Deals (Sales) and Work Orders (Execution) by Sector.
        Merges the two to analyze strong sales but poor execution bottlenecks.
        """
        # Deals by Sector
        deals_sector = deals_df.groupby('Sector/service').agg(
            won_revenue=('Masked Deal value', lambda x: float(x[deals_df.loc[x.index, 'Deal Status'] == 'Won'].sum())),
            pipeline=('Masked Deal value', lambda x: float(x[deals_df.loc[x.index, 'Deal Status'] == 'Open'].sum())),
            deals_count=('Deal Name', 'count')
        ).reset_index()
        deals_sector.rename(columns={'Sector/service': 'Sector'}, inplace=True)
        
        # Work Orders by Sector
        now = pd.Timestamp.now()
        wo_sector = wo_df.groupby('Sector').agg(
            wo_count=('Deal name masked', 'count'),
            completed_wo=('Execution Status', lambda x: int((x == 'Completed').sum())),
            delayed_wo=('Execution Status', lambda x: int(
                ((x == 'Delayed') | ((wo_df.loc[x.index, 'Probable End Date'] < now) & (~x.isin(['Completed', 'Ongoing/Recurring'])))).sum()
            ))
        ).reset_index()
        
        # Merge
        merged = pd.merge(deals_sector, wo_sector, on='Sector', how='outer').fillna(0)
        
        # Calculate rates
        merged['completion_rate'] = (merged['completed_wo'] / merged['wo_count'] * 100.0).replace([np.inf, -np.inf], 0.0).fillna(0.0).round(1)
        merged['delay_rate'] = (merged['delayed_wo'] / merged['wo_count'] * 100.0).replace([np.inf, -np.inf], 0.0).fillna(0.0).round(1)
        
        # Determine bottleneck flag
        # High sales (revenue or pipeline > median) but low completion (< 70%) or high delay (> 15%)
        median_rev = merged['won_revenue'].median() if len(merged) > 0 else 0
        merged['is_bottleneck'] = (
            ((merged['won_revenue'] > median_rev) | (merged['pipeline'] > 0)) & 
            ((merged['completion_rate'] < 70.0) | (merged['delay_rate'] > 15.0))
        )
        
        return merged.to_dict(orient='records')

    @staticmethod
    def get_revenue_trends(deals_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Extracts monthly won revenue trends based on Close Date.
        """
        won_deals = deals_df[(deals_df['Deal Status'] == 'Won') & (deals_df['Close Date (A)'].notna())].copy()
        if len(won_deals) == 0:
            # Fallback to created date if close date is empty
            won_deals = deals_df[deals_df['Deal Status'] == 'Won'].copy()
            won_deals['TrendDate'] = won_deals['Created Date']
        else:
            won_deals['TrendDate'] = won_deals['Close Date (A)']
            
        won_deals['Month'] = won_deals['TrendDate'].dt.strftime('%Y-%m')
        
        trend = won_deals.groupby('Month').agg(
            revenue=('Masked Deal value', 'sum'),
            deals_count=('Deal Name', 'count')
        ).reset_index().sort_values('Month')
        
        # Format month names nicer
        trend['MonthName'] = trend['Month'].apply(lambda x: datetime.strptime(x, '%Y-%m').strftime('%b %Y'))
        return trend.to_dict(orient='records')

    @staticmethod
    def get_pipeline_funnel(deals_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Aggregates deals across stages to form a conversion funnel.
        """
        stages = deals_df.groupby('Deal Stage').agg(
            value=('Masked Deal value', 'sum'),
            count=('Deal Name', 'count')
        ).reset_index()
        
        # Clean stage titles (e.g. "B. Sales Qualified Leads" -> "Sales Qualified Leads")
        def clean_stage_name(name: str) -> str:
            return re.sub(r'^[A-Z]\.\s*', '', name).strip()
            
        stages['StageClean'] = stages['Deal Stage'].apply(clean_stage_name)
        
        # Sort stages logically
        # A. Lead -> B. SQL -> C. Contacted/Proposal -> D. Demo -> E. Neg -> Won/Lost
        def stage_sort_weight(name: str) -> int:
            name_lower = name.lower()
            if 'lead' in name_lower or 'source' in name_lower:
                return 1
            if 'qualified' in name_lower or 'sql' in name_lower:
                return 2
            if 'proposal' in name_lower or 'commercial' in name_lower:
                return 3
            if 'negotiation' in name_lower:
                return 4
            if 'won' in name_lower:
                return 5
            if 'lost' in name_lower:
                return 6
            return 9
            
        stages['weight'] = stages['Deal Stage'].apply(stage_sort_weight)
        stages = stages.sort_values('weight')
        
        return stages[['StageClean', 'value', 'count']].to_dict(orient='records')

    @staticmethod
    def get_top_customers(deals_df: pd.DataFrame, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves top customers by won revenue.
        """
        won_deals = deals_df[deals_df['Deal Status'] == 'Won']
        top = won_deals.groupby('Client Code').agg(
            revenue=('Masked Deal value', 'sum'),
            deals_count=('Deal Name', 'count')
        ).reset_index().sort_values('revenue', ascending=False).head(limit)
        
        return top.to_dict(orient='records')

    @staticmethod
    def get_workload_distribution(wo_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Calculates project ownership workload counts and values.
        """
        distribution = wo_df.groupby('BD/KAM Personnel code').agg(
            total_orders=('Deal name masked', 'count'),
            completed_orders=('Execution Status', lambda x: int((x == 'Completed').sum())),
            delayed_orders=('Execution Status', lambda x: int(
                ((x == 'Delayed') | ((wo_df.loc[x.index, 'Probable End Date'] < pd.Timestamp.now()) & (x != 'Completed'))).sum()
            ))
        ).reset_index()
        
        distribution['active_orders'] = distribution['total_orders'] - distribution['completed_orders']
        return distribution.sort_values('total_orders', ascending=False).to_dict(orient='records')

    @staticmethod
    def run_what_if_scenario(deals_df: pd.DataFrame, wo_df: pd.DataFrame, 
                              pending_close_pct: float, 
                              sector_growth: float, 
                              delay_reduction: float) -> Dict[str, Any]:
        """
        Deterministic "What-If" simulation using Pandas formulas.
        Inputs:
          pending_close_pct: 0 to 100 (percentage of open deals that close as 'Won')
          sector_growth: -100 to 100 (percentage modifier on won revenue of specific sectors or general revenue)
          delay_reduction: 0 to 100 (percentage by which delayed work orders are reduced)
        """
        # Calculate baseline metrics
        baseline = AnalyticsEngine.get_summary_kpis(deals_df, wo_df)
        
        # 1. Simulate Pending Deals closing
        open_deals = deals_df[deals_df['Deal Status'] == 'Open'].copy()
        additional_revenue = 0.0
        if len(open_deals) > 0 and pending_close_pct > 0:
            # Sort by deal stage or select fraction
            # We assume a flat percentage of pipeline closes as Won
            pipeline_value = open_deals['Masked Deal value'].sum()
            additional_revenue = pipeline_value * (pending_close_pct / 100.0)
            
        # 2. Simulate Sector Revenue Growth
        # Apply the growth rate multiplier to won revenue
        rev_multiplier = 1.0 + (sector_growth / 100.0)
        simulated_base_won = baseline['won_revenue'] * rev_multiplier
        simulated_won_revenue = simulated_base_won + additional_revenue
        
        # 3. Simulate Pipeline remaining
        simulated_pipeline = baseline['pipeline'] - additional_revenue
        if simulated_pipeline < 0:
            simulated_pipeline = 0.0
            
        # 4. Simulate Work Order Delay Reduction
        delayed_wo_count = baseline['delayed_work_orders']
        resolved_wo = int(round(delayed_wo_count * (delay_reduction / 100.0)))
        simulated_delayed_wo = max(0, delayed_wo_count - resolved_wo)
        
        # 5. Recalculate completion rate
        total_wo = baseline['total_work_orders_count']
        completed_wo = len(wo_df[wo_df['Execution Status'] == 'Completed'])
        simulated_completed = completed_wo + resolved_wo
        if simulated_completed > total_wo:
            simulated_completed = total_wo
        simulated_completion_rate = (simulated_completed / total_wo * 100.0) if total_wo > 0 else 0.0
        
        # 6. Recalculate simulated conversion rate
        won_deals_count = len(deals_df[deals_df['Deal Status'] == 'Won'])
        lost_deals_count = len(deals_df[deals_df['Deal Status'] == 'Lost'])
        simulated_won_count = won_deals_count + (len(open_deals) * (pending_close_pct / 100.0))
        simulated_closed_count = simulated_won_count + lost_deals_count
        simulated_conversion_rate = (simulated_won_count / simulated_closed_count * 100.0) if simulated_closed_count > 0 else 0.0
        
        # 7. Recalculate Business Health Score
        simulated_stale_deals = max(0, baseline['stale_deals'] - int(round(len(open_deals) * (pending_close_pct / 100.0))))
        simulated_health_score, simulated_health_reasons = AnalyticsEngine.calculate_health_score(
            simulated_conversion_rate, simulated_completion_rate, simulated_delayed_wo, 
            total_wo, simulated_won_revenue, simulated_stale_deals
        )
        
        simulated_risk_score, simulated_risk_reasons = AnalyticsEngine.calculate_risk_score(
            simulated_delayed_wo, total_wo, simulated_stale_deals, 
            int(len(open_deals) * (1 - pending_close_pct/100.0)), simulated_won_revenue
        )
        
        # Differences
        rev_diff = simulated_won_revenue - baseline['won_revenue']
        health_diff = simulated_health_score - baseline['business_health_score']
        delay_diff = simulated_delayed_wo - baseline['delayed_work_orders']
        
        return {
            "inputs": {
                "pending_close_pct": pending_close_pct,
                "sector_growth": sector_growth,
                "delay_reduction": delay_reduction
            },
            "baseline": {
                "won_revenue": baseline['won_revenue'],
                "pipeline": baseline['pipeline'],
                "business_health_score": baseline['business_health_score'],
                "delayed_work_orders": baseline['delayed_work_orders'],
                "completion_rate": baseline['completion_rate']
            },
            "simulated": {
                "won_revenue": round(simulated_won_revenue, 2),
                "pipeline": round(simulated_pipeline, 2),
                "business_health_score": simulated_health_score,
                "business_health_explanation": simulated_health_reasons,
                "risk_score": simulated_risk_score,
                "risk_explanation": simulated_risk_reasons,
                "delayed_work_orders": simulated_delayed_wo,
                "completion_rate": round(simulated_completion_rate, 1)
            },
            "deltas": {
                "won_revenue_change": round(rev_diff, 2),
                "business_health_change": health_diff,
                "delayed_work_orders_change": delay_diff
            }
        }
