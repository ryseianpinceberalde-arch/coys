@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Coy's Corner - POS System

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"
set "MERGED_MONGO_DBPATH=%ROOT%\mongo-merged-copy"
set "MONGO_DBPATH="
set "MONGO_EXE="
set "MONGO_PID="
set "RUNNING_MONGO_CMD="

for /f "delims=" %%F in ('dir /b /ad "%ProgramFiles%\MongoDB\Server" 2^>nul') do (
    if exist "%ProgramFiles%\MongoDB\Server\%%F\bin\mongod.exe" set "MONGO_EXE=%ProgramFiles%\MongoDB\Server\%%F\bin\mongod.exe"
)

echo ==========================================
echo   Coy's Corner POS - Starting System
echo ==========================================

REM Start MongoDB
if not defined MONGO_EXE (
    echo MongoDB executable not found under "%ProgramFiles%\MongoDB\Server".
    echo Install MongoDB Community Server or start MongoDB manually, then rerun this script.
    pause
    exit /b 1
)
set "MONGO_DBPATH=%MERGED_MONGO_DBPATH%"
if not exist "%MONGO_DBPATH%" (
    echo Required MongoDB data directory not found: "%MONGO_DBPATH%"
    echo Restore or recreate the merged MongoDB copy before starting the system.
    pause
    exit /b 1
)
for /f "tokens=5" %%P in ('netstat -nao ^| findstr /r /c:":27017 .*LISTENING"') do set "MONGO_PID=%%P"
if not defined MONGO_PID (
    echo [1/3] Starting MongoDB using "%MONGO_DBPATH%"...
    start "MongoDB" /min "%MONGO_EXE%" --dbpath "%MONGO_DBPATH%" --bind_ip 127.0.0.1
    timeout /t 5 /nobreak >nul
) else (
    for /f "usebackq delims=" %%F in (`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"ProcessId=%MONGO_PID%\" | Select-Object -ExpandProperty CommandLine)"`) do set "RUNNING_MONGO_CMD=%%F"
    if not defined RUNNING_MONGO_CMD (
        echo [1/3] MongoDB is already listening on port 27017, but the process command could not be resolved.
        echo Stop the existing MongoDB instance and rerun this script.
        pause
        exit /b 1
    )
    echo !RUNNING_MONGO_CMD! | find /I "%MONGO_DBPATH%" >nul
    if errorlevel 1 (
        echo [1/3] MongoDB is already running on port 27017 with a different data path.
        echo Expected: "%MONGO_DBPATH%"
        echo Running:  !RUNNING_MONGO_CMD!
        echo Stop the other MongoDB instance and rerun this script.
        pause
        exit /b 1
    )
    echo [1/3] MongoDB is already running on port 27017 using "%MONGO_DBPATH%".
)

REM Start Backend
netstat -na | findstr /r /c:":5000 .*LISTENING" >nul
if errorlevel 1 (
    echo [2/3] Starting Backend (port 5000)...
    start "Coy's Corner Backend" /min cmd /k "cd /d ""%BACKEND_DIR%"" && node src/server.js"
    timeout /t 3 /nobreak >nul
) else (
    echo [2/3] Backend is already running on port 5000.
)

REM Start Frontend
netstat -na | findstr /r /c:":3000 .*LISTENING" >nul
if errorlevel 1 (
    echo [3/3] Starting Frontend (port 3000)...
    start "Coy's Corner Frontend" /min cmd /k "cd /d ""%FRONTEND_DIR%"" && npm.cmd run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo [3/3] Frontend is already running on port 3000.
)

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
