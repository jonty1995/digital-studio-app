# PowerShell script to view live logs of Digital Studio on Raspberry Pi 5
# Usage: .\view_pi_logs.ps1

$PI_USER = "jonty"
$PI_HOST = "digital-studio-rp5"
$PI_DIR = "~/digital-studio-app"

Write-Host "--- Streaming Live Backend Logs from $PI_HOST ---" -ForegroundColor Cyan
Write-Host "(Press Ctrl+C to stop)" -ForegroundColor Gray

ssh -t $PI_USER@$PI_HOST "cd $PI_DIR && docker compose logs -f backend"
