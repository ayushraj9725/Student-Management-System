@echo off
echo ========================================================
echo Starting Student Management System - Backend (Port 8085)
echo ========================================================
cd /d "%~dp0backend"
set SERVER_PORT=8085
call mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8085"
pause
