# PowerShell script to check the status of Digital Studio on Raspberry Pi 5
# Usage: .\check_pi_status.ps1

$PI_USER = "jonty"
$PI_HOST = "digital-studio-rp5"
$PI_DIR = "~/digital-studio-app"

Write-Host "--- Checking Status on Digital Studio RPi 5 ---" -ForegroundColor Cyan
Write-Host "(Connecting to $PI_HOST...)" -ForegroundColor Gray

ssh $PI_USER@$PI_HOST "cd $PI_DIR && ./scripts/check_status.sh"

Write-Host "`nCheck Complete!" -ForegroundColor Cyan
Read-Host "Press Enter to exit..."
