@echo off
echo Killing all node processes...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM nodemon.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting API server...
cd /d "%~dp0"
npm run dev
