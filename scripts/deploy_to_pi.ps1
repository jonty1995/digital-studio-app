# PowerShell script to deploy artifacts to Raspberry Pi 5
# Usage: .\deploy_to_pi.ps1
#
# TIP: To skip entering your password every time, run these two commands ONCE in PowerShell:
# 1. ssh-keygen -t ed25519
# 2. type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh jonty@digital-studio-rp5 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

$PI_USER = "jonty"
$PI_HOST = "digital-studio-rp5"
$PI_DIR = "~/digital-studio-app"

Write-Host "--- Deployment to Digital Studio RPi 5 ---" -ForegroundColor Cyan

# 1. Check for artifacts from the scripts/ directory
if (-not (Test-Path "../backend/target/app.jar")) {
    Write-Host "Error: ../backend/target/app.jar not found. Run 'mvn package' first." -ForegroundColor Red
    exit
}
if (-not (Test-Path "../frontend/dist")) {
    Write-Host "Error: ../frontend/dist folder not found. Run 'npm run build' first." -ForegroundColor Red
    exit
}

Write-Host "Artifacts found. Starting transfer..." -ForegroundColor Green

# 2. Prepare artifacts for transfer (Using a staging folder for clean ZIP structure)
Write-Host "Step 1: Preparing staging folder and compressing artifacts..." -ForegroundColor Yellow

$tempPath = Join-Path $PSScriptRoot "temp_deploy"
if (Test-Path $tempPath) { Remove-Item $tempPath -Recurse -Force }
New-Item -ItemType Directory -Path $tempPath | Out-Null

# Copy all required files to staging
Copy-Item "../backend/target/app.jar" -Destination $tempPath
Copy-Item "../backend/Dockerfile.backend.run" -Destination $tempPath
Copy-Item "../frontend/dist" -Destination $tempPath -Recurse
Copy-Item "../frontend/Dockerfile.frontend.run" -Destination $tempPath
Copy-Item "../frontend/nginx.conf" -Destination $tempPath
Copy-Item "../docker-compose.run.yml" -Destination $tempPath
Copy-Item "check_status.sh" -Destination $tempPath
Copy-Item "show_logs.sh" -Destination $tempPath

if (Test-Path "../deploy.zip") { Remove-Item "../deploy.zip" }
Compress-Archive -Path "$tempPath/*" -DestinationPath "../deploy.zip"
Remove-Item $tempPath -Recurse -Force

# 3. Transfer and Deploy
Write-Host "Step 2: Transferring deploy.zip to Pi..." -ForegroundColor Yellow
Write-Host "(Password 1 of 2: for File Transfer)" -ForegroundColor Gray
scp "../deploy.zip" "$PI_USER@$PI_HOST`:$PI_DIR/"

Write-Host "Step 3: Extracting and Deploying on Pi..." -ForegroundColor Yellow
Write-Host "(Password 2 of 2: for Remote Command)" -ForegroundColor Gray

# Hyper-robust remote command
$remoteCmd = "cd $PI_DIR ; " +
             "unzip -o deploy.zip ; " +
             "for f in *\\*; do [ -f `"`$f`"` ] && mkdir -p `"`$(dirname `"`${f//\\//}`"` )`"` && mv `"`$f`"` `"`${f//\\//}`"`; done ; " +
             "mkdir -p backend/target frontend scripts ; " +
             "find . -name 'app.jar' -exec mv {} backend/target/ \; 2>/dev/null ; " +
             "find . -name 'dist' -type d -exec cp -r {}/. frontend/ \; 2>/dev/null ; " +
             "find . -name 'nginx.conf' -exec mv {} frontend/ \; 2>/dev/null ; " +
             "find . -name 'Dockerfile.backend.run' -exec mv {} backend/ \; 2>/dev/null ; " +
             "find . -name 'Dockerfile.frontend.run' -exec mv {} frontend/ \; 2>/dev/null ; " +
             "find . -name 'docker-compose.run.yml' -exec mv {} docker-compose.yml \; 2>/dev/null ; " +
             "find . -name '*.sh' -not -path './scripts/*' -exec mv {} scripts/ \; 2>/dev/null ; " +
             "chmod +x scripts/*.sh 2>/dev/null ; " +
             "docker compose up -d --build ; " +
             "rm deploy.zip"

ssh -o ServerAliveInterval=60 $PI_USER@$PI_HOST "$remoteCmd"

Write-Host "`nDeployment Complete!" -ForegroundColor Cyan
Write-Host "App available at: http://$PI_HOST"

# Keep the window open
Write-Host "`n-------------------------------------------"
Read-Host "Press Enter to exit..."
