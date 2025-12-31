@echo off
echo Starting Digital Studio in Background...
echo Logs will be written to backend.log and frontend.log in this directory.

:: Create temporary VBScript to launch hidden processes
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "cmd /c cd backend && mvn spring-boot:run > ..\backend.log 2>&1", 0
echo WshShell.Run "cmd /c cd frontend && npm run dev > ..\frontend.log 2>&1", 0
) > start_hidden.vbs


:: Execute the VBScript
cscript //nologo start_hidden.vbs

:: Cleanup
del start_hidden.vbs

echo Servers started in background.
echo Detecting active ports...
powershell -ExecutionPolicy Bypass -File detect_ports.ps1

echo Closing this window...
timeout /t 5 >nul
exit
