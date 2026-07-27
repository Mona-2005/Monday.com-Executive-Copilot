@echo off
title Monday.com Copilot - Backend
echo ========================================
echo  Backend: FastAPI + Uvicorn
echo ========================================

cd /d "%~dp0"

:: Create venv if missing
if not exist .venv (
    echo [INFO] Creating virtual environment...
    python -m venv .venv
)

:: Activate venv
call .venv\Scripts\activate.bat

:: Install/update dependencies
echo [INFO] Installing backend dependencies...
pip install -r backend/requirements.txt --quiet

:: Start backend with hot-reload
echo [INFO] Starting backend on http://localhost:8000
echo [INFO] API docs at http://localhost:8000/docs
echo.
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

pause
