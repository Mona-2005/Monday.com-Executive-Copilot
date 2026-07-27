# Skylark Drones Technical Assignment - Decision Log
**Project**: Monday.com Business Intelligence Executive Copilot  
**Author**: Senior AI & Full Stack Engineer  

---

## 1. Key Assumptions

### 1.1 Ingestion & Board Joins
- **Dynamic Board Joins**: Since Monday.com does not support native SQL JOIN operations, we assumed the primary join key between the **Deals Board** (Sales pipeline) and the **Work Orders Board** (Project execution) is the **Sector** column. This allows us to track macro sector performance (e.g., checking if the "Mining" sector has high won revenue but low delivery execution metrics).
- **Column ID mapping**: Monday.com GraphQL API returns custom generated column IDs (e.g., `status_1` or `numbers2`). We assumed that live boards will have columns with matching titles (e.g., "Masked Deal value"). Our Monday integration queries the board metadata first to dynamically map IDs back to human-readable titles before analytical ingestion.

### 1.2 Data Resilience & "Dirty" Records
- **Header Duplication**: In the raw sheets (specifically Work Order Tracker), column headers was present on row 2 (0-indexed line 1). We assumed this layout was constant and handled it by skipping the first row during CSV loading.
- **Normalizations**: Sector names contained trailing spaces and casing issues (e.g. `energy`, `ENERGY`). We mapped these to title case (`Energy`). Missing revenue values were assumed to be `0.0` INR rather than dropping the rows to maintain pipeline size.
- **Date Inconsistencies**: Date columns contained mixed formats (e.g. `YYYY-MM-DD` and `DD/MM/YYYY`). We parsed them using multi-format sequential regex checks, defaulting to `NaT` (Not a Time) for corrupt values, while deducting points from the overall data quality score.

---

## 2. Technical Stack Choices & Justifications

### 2.1 Backend: FastAPI + Pandas
- **Why FastAPI**: Extremely lightweight, high-throughput asynchronous execution, and standard support for mounting static file serving. It has out-of-the-box CORS configuration and handles Pydantic model validation.
- **Why Pandas (Data Engine)**: Standard Python lists/dicts are slow for joins and aggregations. Pandas provides vector calculations and direct support for filtering, grouping, and matrix operations. It handles NaNs elegantly.
- **AI Separation Constraint**: To guarantee absolute truth and prevent hallucinated math figures, all formulas are computed in Pandas. The Gemini LLM is strictly used for semantic summarizing, intent parsing, and compiling strategic recommendations.

### 2.2 Frontend: React (Vite) + Tailwind CSS v4 + Recharts
- **Why Vite 8**: Exceptional developer startup speed, and native asset bundling.
- **Why Tailwind v4**: Utilizes a CSS-first compiler (`@tailwindcss/vite`), eliminating PostCSS overhead and allowing rapid design iteration.
- **Why Recharts**: A lightweight React-wrapper over D3, allowing high visual customization, responsive resizing, and SVG tooltips.

---

## 3. Trade-offs Chosen & Why

### 3.1 Single-Server SPA serving (FastAPI hosts React dist)
- **Trade-off**: Building the React frontend into static assets and serving it directly via FastAPI `StaticFiles`.
- **Reasoning**: Evaluators typically have limited setup time. Forcing them to install Node.js, run `npm install`, and maintain two concurrent terminals is a major source of friction. Serving the built static files directly from FastAPI means the evaluator only needs Python to run the entire app. The source React code remains in `/frontend` for full code assessment.

### 3.2 PDF Generation via Browser Print Stylesheets (`@media print`)
- **Trade-off**: Using browser print styles (`window.print()`) instead of a python PDF library (like ReportLab or Weasyprint).
- **Reasoning**: Installing system-level PDF drawing libraries in Python is notoriously brittle on Windows/Mac and often causes dependency crashes. Leveraging `@media print` CSS selectors allows us to hide layouts (like the sidebar and input controls) and print a pixel-perfect page using the browser's native print-to-PDF engine.

### 3.3 Dynamic Local AI Fallback (Zero-Config Execution)
- **Trade-off**: Integrating rule-based query classifiers and static templates when the `GEMINI_API_KEY` is missing.
- **Reasoning**: We cannot guarantee the reviewer will have a Gemini API key ready during evaluation. If the API key is missing, a standard chatbot crashes. We built a semantic keywords router that mimics Gemini by injecting the exact Pandas calculation metrics into professional templates. It behaves identically to the live AI but displays a warning badge: `AI Mode: Simulated`.

---

## 4. Interpretation of "Leadership Updates"

We interpreted "Leadership Updates" as a **Strategic Briefing Suite** rather than a simple data dump. Founders do not just want to see charts; they need to know:
1. **Financial Status**: Realized wins vs active pipeline weight.
2. **Operational Backlog**: Which projects are delayed and which PMs are overloaded.
3. **Execution Bottlenecks (Cross-Board)**: Which sectors are causing delivery friction.
4. **Actionable Recommendations**: Clear, contextual recommendations (e.g. reallocating PMs, cleaning up unassigned data).

We built the **Leadership Reports** module as a one-click dashboard generator. The backend calculates these metrics, passes them to Gemini, and compiles a comprehensive, ready-to-present Markdown briefing (wins, risks, operations, actions). Leaders can instantly download the markdown brief or print it to a PDF for board meetings.
