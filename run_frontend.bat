@echo off
title Monday.com Copilot - Frontend
echo ========================================
echo  Frontend: React + Vite Dev Server
echo ========================================

cd /d "%~dp0\frontend"

:: Install npm packages if node_modules missing
if not exist node_modules (
    echo [INFO] Installing frontend dependencies...
    npm install
)

:: Start Vite dev server
echo [INFO] Starting frontend on http://localhost:5173
echo.
npm run dev

pause
