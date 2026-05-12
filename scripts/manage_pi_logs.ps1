# Interactive PowerShell script to manage Pi logs from Windows
$PI_USER = "jonty"
$PI_HOST = "digital-studio-rp5"
$PI_DIR = "~/digital-studio-app"

function Show-Menu {
    Clear-Host
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "   REMOTE LOG MANAGEMENT (RPi 5)" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host " 1. [CHECK]  View Current Log Level" -ForegroundColor White
    Write-Host " 2. [INFO]   Set to Standard Mode (Normal)" -ForegroundColor Green
    Write-Host " 3. [DEBUG]  Set to Debug Mode (Detailed)" -ForegroundColor Yellow
    Write-Host " 4. [ERROR]  Set to Error Mode (Quiet)" -ForegroundColor Red
    Write-Host " 5. [EXIT]   Exit Management" -ForegroundColor Gray
    Write-Host "===========================================" -ForegroundColor Cyan
}

while ($true) {
    Show-Menu
    $choice = Read-Host "`nSelect an option [1-5]"
    
    $action = ""
    switch ($choice) {
        "1" { $action = "status" }
        "2" { $action = "info" }
        "3" { $action = "debug" }
        "4" { $action = "error" }
        "5" { break }
        default { 
            Write-Host "Invalid selection." -ForegroundColor Red
            Start-Sleep -Seconds 1
            continue 
        }
    }

    if ($action) {
        Write-Host "`n>>> Executing '$action' on Pi..." -ForegroundColor Yellow
        $remoteCmd = "cd $PI_DIR ; ./scripts/manage_logs.sh $action"
        try {
            ssh "$PI_USER@$PI_HOST" $remoteCmd
        } catch {
            Write-Host "Error connecting to Pi: $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host "`nPress any key to return to menu..."
        $null = [System.Console]::ReadKey($true)
    }
}

Write-Host "`nExiting Log Management." -ForegroundColor Gray
