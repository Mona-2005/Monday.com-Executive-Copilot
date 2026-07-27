#!/bin/bash

echo "========================================================"
echo "  Monday.com Executive Copilot - Zero-Config Launcher   "
echo "========================================================"

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python 3 is not installed. Please install Python 3.11+."
    exit 1
fi

# Create Virtual Environment if not exists
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment."
        exit 1
    fi
fi

# Activate Virtual Environment
echo "[INFO] Activating virtual environment..."
source .venv/bin/activate

# Install Requirements
echo "[INFO] Installing backend Python packages..."
pip install -r backend/requirements.txt

# Asynchronously open the browser after a brief delay
echo "[INFO] Launching default web browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    (sleep 2 && open http://127.0.0.1:8000) &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    (sleep 2 && xdg-open http://127.0.0.1:8000) &
fi

# Start Server
echo "[INFO] Starting FastAPI application..."
python backend/app.py
