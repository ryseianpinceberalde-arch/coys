@echo off
title Coy's Corner - POS System

echo ==========================================
echo   Coy's Corner POS - Starting System
echo ==========================================

REM Start MongoDB
echo [1/3] Starting MongoDB...
start /min cmd /c "mongod --dbpath C:\data\db"
timeout /t 3 /nobreak >nul

REM Start Backend
echo [2/3] Starting Backend (port 5000)...
start /min cmd /k "cd /d C:\Users\Ryse\Downloads\coys\backend && node src/server.js"
timeout /t 2 /nobreak >nul

REM Start Frontend
echo [3/3] Starting Frontend (port 3000)...
start /min cmd /k "cd /d C:\Users\Ryse\Downloads\coys\frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo   System is running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo ==========================================
echo.
echo   Admin:  admin@coyscorner.com / Admin@123
echo   Staff:  staff1@coyscorner.com / Staff@123
echo   User:   user1@coyscorner.com / User@123
echo ==========================================
echo.
pause
