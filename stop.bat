@echo off
setlocal enabledelayedexpansion

echo Stopping Digital Studio App...

if not exist .port_config (
    echo Config file .port_config not found.
    echo Trying default ports...
    set BACKEND_PORT=8081
    set FRONTEND_PORT=5174
) else (
    for /f "delims=" %%x in (.port_config) do set "%%x"
)

echo.
echo Target Ports: Backend=!BACKEND_PORT!, Frontend=!FRONTEND_PORT!
echo.

echo Stopping Backend (Port !BACKEND_PORT!)...
set "foundBackend=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":!BACKEND_PORT! .*LISTENING"') do (
    if "%%a" NEQ "" (
        taskkill /F /PID %%a >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo Successfully stopped Backend PID: %%a
            set "foundBackend=1"
        )
    )
)
if "!foundBackend!"=="0" echo No active Backend process found on port !BACKEND_PORT!.

echo.

echo Stopping Frontend (Port !FRONTEND_PORT!)...
set "foundFrontend=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":!FRONTEND_PORT! .*LISTENING"') do (
    if "%%a" NEQ "" (
        taskkill /F /PID %%a >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo Successfully stopped Frontend PID: %%a
            set "foundFrontend=1"
        )
    )
)
if "!foundFrontend!"=="0" echo No active Frontend process found on port !FRONTEND_PORT!.

echo.
echo Done.
pause
