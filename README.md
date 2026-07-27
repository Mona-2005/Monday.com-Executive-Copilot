# Monday.com Executive Copilot

> An enterprise-grade AI-powered Business Intelligence platform that connects to **live Monday.com boards** and lets founders & executives ask natural language questions to get data-driven insights — powered by **Google Gemini AI** and a deterministic **Pandas analytics engine**.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, TailwindCSS v4, Recharts, React Router v7 |
| **Backend** | FastAPI, Uvicorn, Pandas, NumPy |
| **AI Engine** | Google Gemini 2.5 Flash (`google-genai` SDK) |
| **Data Source** | Monday.com GraphQL API (live, paginated) |
| **Language** | Python 3.11+ / Node.js 18+ |

---

## 🌟 Architecture

```
User Query
    │
    ▼
FastAPI Backend
    ├── MondayService          ← Fetches live GraphQL data (30-min metadata cache, 5-min data cache)
    ├── Cleaner                ← Normalizes & cleans raw board data into Pandas DataFrames
    ├── AnalyticsEngine        ← 100% deterministic numerical calculations (KPIs, risk, health scores)
    └── GeminiService          ← Classifies intent + synthesizes structured executive language
          │
          ▼
    Structured Response
    (Executive Summary · Key Findings · Business Impact · Recommendations · Risks · Confidence)
```

**Design principle**: Gemini never touches numbers. All calculations are done by Pandas. Gemini only interprets and explains the results in business language.

---

## 📁 Project Structure

```
SkyLark_project/
├── backend/
│   ├── analytics/         # Deterministic KPI, sector, risk & health score engine
│   ├── cleaning/          # DataFrame normaliser for live Monday.com GraphQL payloads
│   ├── data/              # Fallback sample CSVs (used in simulated mode)
│   ├── models/            # Pydantic request/response schemas
│   ├── prompts/           # Strict prompt templates for Gemini AI
│   ├── routes/            # FastAPI routers (analytics, chat, briefs, monday, settings)
│   ├── services/          # MondayService (GraphQL) + GeminiService (AI)
│   ├── static/            # Built React frontend (served by FastAPI)
│   ├── app.py             # FastAPI app entry point
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # Shared UI components
│   │   ├── pages/         # Dashboard, AIChat, Analytics, Reports, DataQuality, Settings
│   │   ├── services/      # Axios API client
│   │   └── App.jsx        # Root router
│   ├── package.json
│   └── vite.config.js     # Vite config + /api proxy to FastAPI
├── .env                   # 🔒 Your secrets (never commit this)
├── .env.example           # Template for environment variables
├── run.bat                # ▶ Windows: launch everything in one click
├── run_backend.bat        # ▶ Windows: backend only
├── run_frontend.bat       # ▶ Windows: frontend only
└── run.sh                 # ▶ Linux / macOS: launch backend
```

---

## ⚙️ Setup & Installation

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- A **Monday.com** account with API token
- A **Google Gemini** API key ([get one free](https://aistudio.google.com/app/apikey))

---

### Step 1 — Clone & configure environment

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Monday.com GraphQL API
MONDAY_API_TOKEN=your_monday_api_token_here
MONDAY_DEALS_BOARD_ID=your_deals_board_id
MONDAY_WORK_ORDERS_BOARD_ID=your_work_orders_board_id
```

> **Finding your Monday.com Board ID**: Open the board in your browser — the number at the end of the URL is the board ID. e.g. `https://mycompany.monday.com/boards/5030221003` → ID is `5030221003`

---

### Step 2 — Run (Windows)

**Option A — One-click launch (recommended)**
```
Double-click: run.bat
```
Opens backend and frontend in separate terminal windows, then opens your browser automatically.

**Option B — Run separately**
```
Double-click: run_backend.bat     → http://localhost:8000
Double-click: run_frontend.bat    → http://localhost:5173
```

**Option C — Manual commands**
```bash
# Terminal 1 — Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --reload

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

### Step 3 — Run (Linux / macOS)

```bash
chmod +x run.sh
./run.sh
```

Or manually:

```bash
# Terminal 1 — Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## 🌐 Application URLs

| URL | Description |
|---|---|
| `http://localhost:5173` | React frontend (development) |
| `http://localhost:8000` | FastAPI backend (production-served frontend) |
| `http://localhost:8000/docs` | Interactive API documentation (Swagger UI) |
| `http://localhost:8000/redoc` | Alternative API docs (ReDoc) |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/kpis` | Summary KPIs (revenue, pipeline, health score) |
| `GET` | `/api/analytics/sectors` | Sector-level breakdown |
| `GET` | `/api/analytics/trends` | Monthly revenue trends |
| `GET` | `/api/analytics/funnel` | Sales funnel by stage |
| `GET` | `/api/analytics/alerts` | Risk alerts & anomalies |
| `GET` | `/api/analytics/insight-of-the-day` | Single AI-generated executive insight |
| `POST` | `/api/analytics/what-if` | Scenario simulation (sliders) |
| `POST` | `/api/chat/query` | Natural language Q&A |
| `POST` | `/api/briefs/generate` | Generate leadership reports |
| `GET` | `/api/monday/status` | Monday.com connection status |
| `POST` | `/api/monday/clear-cache` | Force refresh all cached data |
| `GET` | `/api/settings` | Current system configuration |

---

## 🧠 AI Modes

The app operates in two modes, selected automatically:

| Mode | When | Behaviour |
|---|---|---|
| **Live AI** | `GEMINI_API_KEY` is set | Gemini 2.5 Flash classifies intent and synthesises structured executive responses |
| **Simulated AI** | No API key | Deterministic rule-based engine produces formatted responses using real Pandas calculations — fully functional without an AI key |

---

## 📊 Dashboard Pages

| Page | Route | Description |
|---|---|---|
| Executive Dashboard | `/` | KPI cards, health score, risk score, sector chart, revenue trends |
| AI Chat Advisor | `/chat` | Natural language Q&A + What-If scenario simulator |
| Deep Analytics | `/analytics` | Sales funnel, top customers, workload distribution, timeline |
| Leadership Reports | `/reports` | One-click AI-generated executive briefs (daily, weekly, monthly) |
| Data Quality | `/quality` | Completeness scores, missing field audit, anomaly detection |
| System Settings | `/settings` | Toggle live/simulated mode, configure connections |

---

## 🔒 Security Notes

- **Never commit `.env`** — it contains your API keys. The `.gitignore` excludes it automatically.
- Monday.com API tokens have board-level permissions — scope them appropriately.
- Gemini API key usage is billed per token. The app uses `gemini-2.5-flash` which is cost-efficient.

---

## 🛠️ Development Notes

- **Caching**: Monday.com board column metadata is cached for **30 minutes**. Board item data is cached for **5 minutes**. Use the "Clear Cache" button in the sidebar or call `POST /api/monday/clear-cache` to force-refresh.
- **Hot Reload**: The backend runs with `--reload` so Python changes apply instantly. The Vite dev server also hot-reloads all frontend changes.
- **Production Build**: To build the React app into the backend's static folder: `cd frontend && npm run build` — after this, `http://localhost:8000` serves the full app.

---

## 📄 License

MIT © 2026
