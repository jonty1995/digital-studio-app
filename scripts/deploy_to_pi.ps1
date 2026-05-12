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

# 1. Selection of Deployment Mode
Write-Host "`n[Deployment Options]" -ForegroundColor White
$doBuild = Read-Host "Do you want to REBUILD the project before deploying? (y/n)"
if ($doBuild -eq "y") {
    Write-Host "`n>>> Building Backend (Maven)..." -ForegroundColor Yellow
    pushd "../backend"
    mvn clean package -DskipTests
    popd

    Write-Host "`n>>> Building Frontend (NPM)..." -ForegroundColor Yellow
    pushd "../frontend"
    npm run build
    popd
}

$isFresh = Read-Host "`nIs this a FRESH deployment (new database) or a RUNNING environment? (f/r)"
$DDL_MODE = "update"
if ($isFresh -eq "r") {
    $DDL_MODE = "none"
    Write-Host ">>> Running mode selected: Database schema will NOT be modified (Safe Mode)." -ForegroundColor Cyan
} else {
    Write-Host ">>> Fresh mode selected: Database schema will be updated/created." -ForegroundColor Yellow
}

# 2. Check for artifacts
if (-not (Test-Path "../backend/target/app.jar")) {
    Write-Host "Error: ../backend/target/app.jar not found." -ForegroundColor Red
    exit
}
if (-not (Test-Path "../frontend/dist")) {
    Write-Host "Error: ../frontend/dist folder not found." -ForegroundColor Red
    exit
}

Write-Host "`nArtifacts found. Starting transfer..." -ForegroundColor Green

# 3. Prepare staging
$tempPath = Join-Path $PSScriptRoot "temp_deploy"
if (Test-Path $tempPath) { Remove-Item $tempPath -Recurse -Force }
New-Item -ItemType Directory -Path $tempPath | Out-Null

Copy-Item "../backend/target/app.jar" -Destination $tempPath
Copy-Item "../backend/Dockerfile.backend.run" -Destination $tempPath
Copy-Item "../frontend/dist" -Destination $tempPath -Recurse
Copy-Item "../frontend/Dockerfile.frontend.run" -Destination $tempPath
Copy-Item "../frontend/nginx.conf" -Destination $tempPath
Copy-Item "../docker-compose.run.yml" -Destination $tempPath
Copy-Item "*.sh" -Destination $tempPath

if (Test-Path "../deploy.zip") { Remove-Item "../deploy.zip" }
Compress-Archive -Path "$tempPath/*" -DestinationPath "../deploy.zip"
Remove-Item $tempPath -Recurse -Force

# 4. Single-Session Deployment (Transfer + Remote Command)
Write-Host "`nStep 2 & 3: Deploying in a single session..." -ForegroundColor Yellow
Write-Host "(Enter Password ONCE below if prompted)" -ForegroundColor Cyan

$zipFile = Resolve-Path "../deploy.zip"
# This command reads the zip from stdin (sent via PowerShell) then executes the rest
$remoteCmd = "cd $PI_DIR ; " +
             "docker compose down 2>/dev/null || true ; " +
             "cat > deploy.zip ; " +
             "unzip -o deploy.zip ; " +
             "mkdir -p backend/target frontend scripts ../uploads ../lab ./logs ; " +
             "mv app.jar backend/target/ 2>/dev/null ; " +
             "mv Dockerfile.backend.run backend/ 2>/dev/null ; " +
             "mv dist/ frontend/ 2>/dev/null ; " +
             "mv nginx.conf frontend/ 2>/dev/null ; " +
             "mv Dockerfile.frontend.run frontend/ 2>/dev/null ; " +
             "mv docker-compose.run.yml docker-compose.yml 2>/dev/null ; " +
             "mv *.sh scripts/ 2>/dev/null ; " +
             "chmod +x scripts/*.sh ; " +
             "sudo chmod -R 777 ../uploads ../lab ./logs ; " +
             "DDL_AUTO=$DDL_MODE docker compose up -d --build ; " +
             "echo 'Waiting for services to start (10s)...' ; sleep 10 ; " +
             "./scripts/check_status.sh ; " +
             "rm deploy.zip"

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "ssh"
$processInfo.Arguments = "-o ServerAliveInterval=60 $PI_USER@$PI_HOST `"$remoteCmd`""
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardInput = $true

try {
    $process = [System.Diagnostics.Process]::Start($processInfo)
    $fileStream = [System.IO.File]::OpenRead($zipFile)
    
    # Pipe the binary zip data to the SSH process's stdin
    $fileStream.CopyTo($process.StandardInput.BaseStream)
    $fileStream.Close()
    $process.StandardInput.Close()
    
    # Wait for completion
    $process.WaitForExit()
    
    if ($process.ExitCode -eq 0) {
        Write-Host "`nDeployment Complete!" -ForegroundColor Cyan
        Write-Host "App available at: http://$PI_HOST"
    } else {
        Write-Host "`nDeployment failed with exit code: $($process.ExitCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "`nError during deployment: $($_.Exception.Message)" -ForegroundColor Red
}

# Keep the window open
Write-Host "`n-------------------------------------------"
Read-Host "Press Enter to exit..."
