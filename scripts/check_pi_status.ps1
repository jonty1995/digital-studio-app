# PowerShell script to check Pi System Status from Windows
$PI_USER = "jonty"
$PI_HOST = "digital-studio-rp5"
$PI_DIR = "~/digital-studio-app"

Write-Host "--- Fetching Raspberry Pi 5 System Health ---" -ForegroundColor Cyan

$remoteCmd = "cd $PI_DIR ; chmod +x ./scripts/system_status.sh ; ./scripts/system_status.sh"

try {
    ssh "$PI_USER@$PI_HOST" $remoteCmd
} catch {
    Write-Host "Error connecting to Pi: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCheck complete. Press any key to exit..."
$null = [System.Console]::ReadKey($true)
