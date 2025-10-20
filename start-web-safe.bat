@echo off
cd /d "C:\Users\Owner\Downloads\ai-agent-browser"
echo Starting AI Agent Browser (Safe Mode)...
echo.
echo This will run the web version only to avoid system issues.
echo.
echo Starting Vite dev server...
start "Vite Server" cmd /k "npm run dev:vite"
echo.
echo Vite server should be starting...
echo You can access the application at: http://localhost:5173
echo (or whatever port Vite shows in the terminal)
echo.
echo Press any key to open the web browser...
pause
start http://localhost:5173
echo.
echo Application should now be running in your web browser.
pause

