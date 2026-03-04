# BIZRA Unified Home Base Shutdown Script
# Stops all services started by activate-unified-system.ps1
# Version: 1.0.0 | Created: 2025-12-07

$ErrorActionPreference = "SilentlyContinue"

# Colors
function Write-Status { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "📌 $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║         BIZRA UNIFIED HOME BASE - SHUTDOWN SEQUENCE              ║
╚══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# 1. Stop Background Jobs
Write-Info "Stopping background jobs..."
$jobs = Get-Job | Where-Object { $_.State -eq 'Running' }
if ($jobs) {
    $jobs | Stop-Job -PassThru | Remove-Job
    Write-Status "Stopped $($jobs.Count) background jobs"
} else {
    Write-Info "No background jobs running"
}

# 2. Stop Docker Services
Write-Info "Stopping Docker services..."
if (Test-Path "docker-compose.yml") {
    docker-compose stop postgres redis
    Write-Status "Stopped PostgreSQL and Redis containers"
} else {
    Write-Warn "docker-compose.yml not found, skipping Docker stop"
}

# 3. Stop Ollama (Optional - usually runs as service/daemon)
# We generally don't kill Ollama as it might be used by other things, 
# but if we started it, we might want to stop it. 
# For now, we'll leave Ollama running as it's a system service often.
Write-Info "Ollama left running (system service)"

# 4. Kill processes by port (fallback)
$ports = @(3000, 8080)
foreach ($port in $ports) {
    $pidObj = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($pidObj) {
        Stop-Process -Id $pidObj -Force
        Write-Status "Killed process on port $port (PID: $pidObj)"
    }
}

Write-Host ""
Write-Status "Shutdown complete. BIZRA Home Base is offline."
Write-Host ""
