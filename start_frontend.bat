@echo off
echo ========================================================
echo Starting My School Care - Frontend (Port 4000)
echo ========================================================
cd /d "%~dp0frontend"
if exist .next rmdir /s /q .next
npm run dev
pause
