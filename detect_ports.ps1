$logFileFrontend = "frontend.log"
$logFileBackend = "backend.log"
$maxRetries = 20
$retryDelay = 1

$frontendPort = ""
$backendPort = ""

Write-Host "Waiting for services to start..."


for ($i = 0; $i -lt $maxRetries; $i++) {
    if (Test-Path $logFileFrontend) {
        $content = Get-Content $logFileFrontend -Raw
        # Strip ANSI escape codes
        $contentClean = $content -replace "\x1B\[[0-9;]*[a-zA-Z]", ""
        if ($contentClean -match "Local:\s+http://localhost:(\d+)/") {
            $frontendPort = $matches[1]
        }
    }

    if (Test-Path $logFileBackend) {
        $content = Get-Content $logFileBackend -Raw
        # Strip ANSI escape codes (just in case)
        $contentClean = $content -replace "\x1B\[[0-9;]*[a-zA-Z]", ""
        if ($contentClean -match "Tomcat started on port (\d+)") {
            $backendPort = $matches[1]
        }
    }

    if ($frontendPort -ne "" -and $backendPort -ne "") {
        break
    }

    Start-Sleep -Seconds $retryDelay
    Write-Host "." -NoNewline
}


Write-Host ""

if ($frontendPort -eq "") {
    Write-Host "Could not detect Frontend port. Defaulting to 5174."
    $frontendPort = "5174"
} else {
    Write-Host "Detected Frontend port: $frontendPort"
}

if ($backendPort -eq "") {
    Write-Host "Could not detect Backend port. Defaulting to 8081."
    $backendPort = "8081"
} else {
    Write-Host "Detected Backend port: $backendPort"
}

$output = "FRONTEND_PORT=$frontendPort`r`nBACKEND_PORT=$backendPort"
$output | Out-File ".port_config" -Encoding ascii


Write-Host "Ports saved to .port_config"

if ($frontendPort -ne "") {
    $url = "http://localhost:$frontendPort"
    Write-Host "Opening $url ..."
    Start-Process $url
}

