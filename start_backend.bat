@echo off
echo ========================================================
echo Starting Student Management System - Spring Boot Backend
echo ========================================================
cd /d "%~dp0backend"
call mvnw.cmd spring-boot:run
pause
