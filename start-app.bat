@echo off
cd /d "C:\Users\Owner\Downloads\ai-agent-browser"
echo Starting AI Agent Browser...
echo.
echo Starting Vite dev server...
start "Vite Server" cmd /k "npm run dev:vite"
echo Waiting for Vite to start...
timeout /t 5 /nobreak > nul
echo Starting Electron...
start "Electron App" cmd /k "npm run dev:electron"
echo.
echo Application should be starting in separate windows.
echo Check the Electron window for the main application.
pause

