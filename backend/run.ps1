# LearnAI Backend Runner
# Loads .env from project root and starts Spring Boot with correct DB config
# Usage: .\run.ps1

# Auto-clear port 5000
$existing = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    Write-Host "Port 5000 in use (PID $($existing.OwningProcess)) - killing..." -ForegroundColor Yellow
    Stop-Process -Id $existing.OwningProcess -Force
    Start-Sleep -Seconds 1
    Write-Host "Port 5000 cleared." -ForegroundColor Green
}

# Load .env
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $key   = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host ".env loaded." -ForegroundColor Green
} else {
    Write-Host "No .env found, using application.properties defaults." -ForegroundColor Yellow
}

Write-Host "Starting Spring Boot on port 5000..." -ForegroundColor Cyan

# Pass DB config as Spring env vars (avoids shell quoting issues with ? in JDBC URL)
$env:SPRING_DATASOURCE_URL      = $env:DATABASE_URL
$env:SPRING_DATASOURCE_USERNAME = $env:DB_USER
$env:SPRING_DATASOURCE_PASSWORD = $env:DB_PASS

.\mvnw.cmd spring-boot:run
