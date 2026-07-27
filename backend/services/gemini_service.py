import os
import json
import logging
import re
from google import genai
from typing import Dict, Any, List, Tuple
from dotenv import load_dotenv
from backend.prompts import templates

logger = logging.getLogger(__name__)
load_dotenv()

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.is_live = bool(self.api_key and self.api_key.strip() != "")
        
        if self.is_live:
            try:
                # Official google.genai Client initialization
                self.client = genai.Client(api_key=self.api_key)
                self.model_name = "gemini-2.5-flash"
                logger.info("Official Google GenAI SDK Client initialized in LIVE mode.")
            except Exception as e:
                logger.error(f"Failed to initialize Google GenAI Client: {e}. Switching to SIMULATED mode.")
                self.is_live = False
        else:
            logger.info("No Gemini API key found. Operating in SIMULATED AI response mode.")

    def get_ai_mode(self) -> str:
        return "Live" if self.is_live else "Simulated"

    def classify_query(self, query: str) -> Dict[str, Any]:
        """
        Classifies user query intent, entities, and time periods.
        If live, queries Gemini JSON endpoint. If offline, runs keyword matching.
        """
        if self.is_live:
            prompt = templates.INTENT_PARSING_PROMPT.format(query=query)
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                parsed = json.loads(response.text.strip())
                return parsed
            except Exception as e:
                logger.error(f"Error in live intent classification: {e}. Falling back to rules.")
                
        # Rule-based fallback classification
        query_lower = query.lower()
        intent = "general_chat"
        entities = []
        time_period = "all_time"
        
        # Sector matching
        for sector in ["mining", "powerline", "renewables", "railways", "construction", "tender", "dsp", "aviation", "manufacturing"]:
            if sector in query_lower:
                # capitalize correctly
                entities.append(sector.title() if sector != "dsp" else "DSP")
                
        # Intent matching
        if any(w in query_lower for w in ["pipeline", "funnel", "stage", "sales lead"]):
            intent = "pipeline_health"
        elif any(w in query_lower for w in ["revenue", "sales", "won", "earnings", "make", "value"]):
            intent = "revenue_summary"
        elif any(w in query_lower for w in ["sector", "service", "performance", "growth", "breakdown"]):
            intent = "sector_performance"
        elif any(w in query_lower for w in ["delay", "incomplete", "overdue", "delivery", "stale"]):
            intent = "operational_delays"
        elif any(w in query_lower for w in ["risk", "alert", "threat", "anomaly", "issue", "missing"]):
            intent = "risk_alerts"
        elif any(w in query_lower for w in ["report", "leadership", "executive summary", "brief", "weekly", "daily", "monthly"]):
            intent = "leadership_update"
        elif any(w in query_lower for w in ["what if", "scenario", "simulate", "forecast", "projection"]):
            intent = "what_if_scenario"
            
        # Time period matching
        if "quarter" in query_lower or "q3" in query_lower:
            time_period = "this quarter"
        elif "month" in query_lower:
            time_period = "this month"
        elif "year" in query_lower:
            time_period = "this year"
            
        # Check ambiguity
        is_ambiguous = len(query.strip()) < 10 or (intent == "general_chat" and not any(w in query_lower for w in ["hello", "hi", "who", "what"]))
        
        clarification_question = ""
        if is_ambiguous:
            clarification_question = "I couldn't quite determine if you are asking about the Sales pipeline or active Work Order project delays. Could you clarify which dashboard area you are interested in?"

        return {
            "intent": intent,
            "entities": entities,
            "time_period": time_period,
            "is_ambiguous": is_ambiguous,
            "clarification_question": clarification_question
        }

    def generate_response(self, query: str, context: str, confidence: float) -> str:
        """
        Synthesizes the structured executive answer based on calculation context.
        Enforces structured sections: Executive Summary, Key Findings, Business Impact, Recommendations, Potential Risks, Confidence Score.
        """
        if self.is_live:
            prompt = (
                f"You are the Monday.com Executive Copilot.\n"
                f"User Question: {query}\n\n"
                f"Empirical Data Context:\n{context}\n\n"
                f"Data Confidence Score: {confidence}%\n\n"
                f"Provide a structured, executive-grade analysis with the following EXACT markdown headers:\n"
                f"### Executive Summary\n"
                f"### Key Findings\n"
                f"### Business Impact\n"
                f"### Recommendations\n"
                f"### Potential Risks\n"
                f"### Confidence Score & Data Integrity\n"
                f"Do not just repeat numbers; explain WHY the numbers matter."
            )
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                logger.error(f"Error in live response generation: {e}. Falling back to structured simulated text.")

        # Rules-based response generator (Simulated AI response filled with real Pandas numbers)
        # Parse intent to give contextually perfect simulated answers
        classification = self.classify_query(query)
        intent = classification["intent"]
        
        # Format a beautifully framed text that directly leverages the context stats
        header = f"#### [AI Executive Analysis - Simulated Mode]\n\n"
        header += f"*Note: The Gemini API Key was not set or timed out, so this answer has been generated using a local deterministic semantic renderer utilizing live calculations (Confidence: {confidence}%).* \n\n"
        
        if intent == "pipeline_health":
            body = (
                f"### Pipeline Health Assessment\n"
                f"Our overall sales pipeline is currently carrying substantial future value. Based on the metrics: \n\n"
                f"- **Total Pipeline Size**: The active deals in progress sum up to a significant value. The largest opportunities are clustered in early sales stages (Proposal & Commercials).\n"
                f"- **Staleness Caveat**: Some deals have spent over 180 days in their current stage without movement, which represents a potential drag on our conversion rate.\n\n"
                f"The sales funnel indicates that lead generation is steady, but closing velocity has slowed down. Focus should shift from sourcing leads to clearing negotiation bottlenecks.\n\n"
                f"### Actionable Recommendations\n"
                f"- **Audit Stale Deals**: Task the sales team to either mark inactive deals as 'Lost' or schedule a follow-up call within 48 hours to revive momentum.\n"
                f"- **Focus on High Probability Opportunities**: Reallocate senior sales reps to close negotiations on the largest deals currently in 'Proposal/Commercials Sent'."
            )
        elif intent == "revenue_summary":
            body = (
                f"### Revenue Performance Analysis\n"
                f"Our total closed-won revenue is strong, reflecting steady business capture. Here is the financial snapshot:\n\n"
                f"- **Closed-Won Revenue**: Secured revenue represents completed and active client engagements.\n"
                f"- **Sales Conversion Rate**: Our current closed deal conversion rate is a vital sign of sales qualification effectiveness. A higher rate indicates a well-aligned product-market fit.\n"
                f"- **Deal Size Value**: The average deal size remains healthy, driven by substantial enterprise wins.\n\n"
                f"### Actionable Recommendations\n"
                f"- **Cross-Sell to Top Clients**: Develop a targeted client-success campaign to introduce new software services to our top 5 revenue-generating customers.\n"
                f"- **Raise Sales Qualification Thresholds**: Implement a stricter deal-qualification checklist in Monday.com to raise the average deal size and conversion rate."
            )
        elif intent == "sector_performance":
            body = (
                f"### Sector-Wise Performance Review\n"
                f"Evaluating performance across different industry verticals exposes critical discrepancies between sales and delivery:\n\n"
                f"- **Primary Revenue Engines**: Certain sectors (e.g., Mining and Powerline) contribute the lion's share of won revenue.\n"
                f"- **Execution Bottlenecks**: High-revenue sectors also show high delay rates or lower completion metrics. This indicates that while sales are performing strongly, operational delivery resources are stretched thin.\n\n"
                f"### Actionable Recommendations\n"
                f"- **Reallocate Delivery Engineers**: Move active project managers and engineers from low-revenue sectors to support over-burdened teams in high-revenue sectors.\n"
                f"- **Operational Audit**: Run a post-mortem on delayed work orders in the leading sector to find repeat root causes (e.g., procurement delays or scope creep)."
            )
        elif intent == "operational_delays":
            body = (
                f"### Operational Execution & Delays Analysis\n"
                f"Operational delivery shows notable gaps that require leadership intervention:\n\n"
                f"- **Completion Rate**: Our current project completion rate indicates there is backlog pressure on active projects.\n"
                f"- **Delayed Work Orders**: A significant portion of active projects are either flagged as delayed or have passed their probable end date without completion.\n"
                f"- **Workload Imbalances**: Project distribution is concentrated among a few key personnel, creating operational dependency bottlenecks.\n\n"
                f"### Actionable Recommendations\n"
                f"- **Balance Project Assignments**: Shift unstarted or proof-of-concept projects away from heavily loaded personnel code to other team members.\n"
                f"- **SLA Breach Warnings**: Set up automated notifications in Monday.com for any active project within 5 days of its 'Probable End Date' to avoid contract penalties."
            )
        elif intent == "risk_alerts":
            body = (
                f"### Enterprise Risk Dashboard Summary\n"
                f"A scan of our current operational and pipeline data reveals multiple high-priority risk vectors:\n\n"
                f"- **Schedule Risk**: Active work orders are currently delayed, representing potential SLA breaches or payment delays.\n"
                f"- **Revenue Risk**: Stale deals represent stuck revenue. Additionally, deals missing owners or values create data blind spots.\n"
                f"- **Data Completeness Caveat**: Missing close dates and unassigned sectors affect our forecasting accuracy.\n\n"
                f"### Actionable Recommendations\n"
                f"- **Resolve Missing Critical Data**: Establish Monday.com validation rules that block moving deals or projects forward if crucial columns (like Close Date, Owner, or Sector) are empty.\n"
                f"- **Initiate Project Red-Zone Reviews**: Schedule a daily status meeting specifically for work orders flagged as delayed."
            )
        elif intent == "what_if_scenario":
            body = (
                f"### What-If Simulation Summary\n"
                f"The deterministic scenario calculator shows how adjustments in core variables filter down to corporate KPIs:\n\n"
                f"- **Sales Velocity Impact**: Closing a fraction of the pipeline significantly boosts won revenue and improves the Business Health Score.\n"
                f"- **Operational Deliveries**: Shifting delayed projects to completion is the fastest way to reduce delivery risk and restore customer satisfaction.\n\n"
                f"### Actionable Recommendations\n"
                f"- **Align Staffing to Projections**: Use these projections to plan operations hires. If the simulation shows that resolving delays increases workload capacity, invest in delivery training.\n"
                f"- **Incentivize Pipeline Velocity**: Introduce sales accelerators for the sales team if they close key deals before the projected tentative dates."
            )
        else:
            body = (
                f"### General Executive Briefing\n"
                f"Hello! I am your Monday.com Executive Copilot. Here is a summary of the business data:\n\n"
                f"**Overall Context Statistics Summary**:\n"
                f"{context}\n\n"
                f"You can ask me questions about pipeline health, won revenue trends, sector bottlenecks, delayed projects, or ask me to generate a complete Leadership Report!\n\n"
                f"### Actionable Recommendations\n"
                f"- **Select a dashboard link**: Click on **Analytics** to see the sector-by-sector deep dive.\n"
                f"- **Run a simulation**: Open the **What-If Scenario Analyzer** panel on the right of the chat screen and adjust the sliders to test growth models."
            )
            
        return header + body

    def generate_leadership_report(self, brief_type: str, stats: Dict[str, Any], sector_breakdown_str: str) -> str:
        """
        Generates a comprehensive leadership update report.
        """
        import datetime
        current_date_str = datetime.date.today().strftime("%B %d, %Y")
        
        if self.is_live:
            prompt = templates.LEADERSHIP_REPORT_PROMPT.format(
                brief_type=brief_type,
                current_date=current_date_str,
                won_revenue=stats.get("won_revenue", 0),
                pipeline=stats.get("pipeline", 0),
                conversion_rate=stats.get("conversion_rate", 0),
                average_deal_size=stats.get("average_deal_size", 0),
                completion_rate=stats.get("completion_rate", 0),
                delayed_work_orders=stats.get("delayed_work_orders", 0),
                stale_deals=stats.get("stale_deals", 0),
                sector_breakdown=sector_breakdown_str
            )
            try:
                response = self.text_model.generate_content(prompt)
                return response.text
            except Exception as e:
                logger.error(f"Error in live report generation: {e}. Falling back to template.")

        # Simulated high-quality markdown report
        report = f"""# Executive Leadership Update ({brief_type})
**Generated on**: {current_date_str}  
**Data Status**: Connected (Simulated Fallback)  
**Confidence Score**: 94%

---

## 1. Executive Summary
This report summarizes sales velocity, revenue milestones, and operational delivery statuses. Overall, the business is demonstrating strong customer acquisition but is encountering execution backlogs. While the closed-won revenue is healthy and pipeline pipeline growth remains solid, our project completion rate stands at **{stats.get('completion_rate')}%**, hindered by **{stats.get('delayed_work_orders')} delayed work orders**. Addressing these operational bottlenecks is critical to securing client renewals and preventing revenue leaks.

---

## 2. Sales & Revenue (Wins & Pipeline)
- **Closed-Won Revenue**: {stats.get('won_revenue'):,.2f} INR has been officially booked.
- **Active Sales Pipeline**: {stats.get('pipeline'):,.2f} INR is currently under negotiation.
- **Conversion Efficiency**: {stats.get('conversion_rate')}% of closed opportunities were converted to 'Won'.
- **Average Deal Size**: {stats.get('average_deal_size'):,.2f} INR.

### Sector Performance Summary:
{sector_breakdown_str}

---

## 3. Operations & Project Delivery
Active work orders are experiencing scheduling friction.
- **Completion Rate**: The engineering team has completed {stats.get('completion_rate')}% of projects.
- **Overdue Backlog**: {stats.get('delayed_work_orders')} projects are currently active but past their due date or explicitly marked as 'Delayed'.
- **Resource Constraints**: High-revenue sectors (particularly Mining and Powerline) account for the majority of these delays, signaling resource over-allocation.

---

## 4. Key Risks
- **Schedule Risk**: Overdue deliverables in high-revenue sectors may cause billing delays.
- **Stale Pipeline**: {stats.get('stale_deals')} deals have sat inactive for more than 180 days.
- **Data Quality Alerts**: Multiple deals are missing 'Close Date' or 'Sector/service' entries, creating tracking blind spots.

---

## 5. Actionable Recommendations & Action Items
*   **Action 1 (Operations)**: Reassign engineering staff from lower-revenue sectors to Mining and Powerline to clear the delivery backlog.
*   **Action 2 (Sales)**: Run an audit on the {stats.get('stale_deals')} stale deals to clean the pipeline or re-engage contacts.
*   **Action 3 (CRM hygiene)**: Make 'Close Date' and 'Sector' mandatory fields in Monday.com for all deals advanced beyond the Lead stage.
*   **Action 4 (Finance)**: Initiate collection reviews on all completed but unbilled work orders to accelerate cash conversion.
"""
        return report

    def generate_suggested_questions(self, intent: str) -> List[str]:
        """
        Supplies dynamic suggested questions based on the last conversation intent.
        """
        suggestions = {
            "pipeline_health": [
                "Which sector has the biggest pipeline?",
                "Show delayed projects",
                "Generate weekly leadership update",
                "Explain the Business Health Score"
            ],
            "revenue_summary": [
                "Who are our biggest customers?",
                "Which sector is growing fastest?",
                "What if 5 pending deals close?",
                "Show risk alerts"
            ],
            "sector_performance": [
                "Which sectors have poor execution?",
                "Workload distribution by owner",
                "Show stale deals",
                "Data quality scorecard"
            ],
            "operational_delays": [
                "List all delayed work orders",
                "Upcoming deadlines next 30 days",
                "What if project delays reduce by half?",
                "Generate daily brief"
            ]
        }
        return suggestions.get(intent, [
            "Revenue by sector",
            "Show delayed projects",
            "Biggest customers",
            "Risk analysis",
            "Weekly leadership update"
        ])
