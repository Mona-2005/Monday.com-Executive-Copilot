@echo off
title Monday.com Executive Copilot
echo ========================================================
echo   Monday.com Executive Copilot - Full Stack Launcher
echo ========================================================
echo.
echo  Launching backend and frontend in separate windows...
echo.

cd /d "%~dp0"

:: Open backend in its own window
start "Backend - FastAPI" cmd /k run_backend.bat

:: Small delay so backend starts first
timeout /t 3 /nobreak >nul

:: Open frontend in its own window
start "Frontend - Vite" cmd /k run_frontend.bat

:: Open browser after both start
timeout /t 5 /nobreak >nul
echo [INFO] Opening app in browser...
start http://localhost:5173

echo.
echo  Both servers are starting in separate windows.
echo  Backend  ^> http://localhost:8000
echo  Frontend ^> http://localhost:5173
echo  API Docs ^> http://localhost:8000/docs
echo.
pause
