# BIZRA Unified Home Base Startup Script
# Orchestrates all services: BIZRA Genesis + HERMES + Support Services
# Version: 1.0.0 | Created: 2025-12-07

param(
    [switch]$SkipDocker,
    [switch]$SkipOllama,
    [switch]$HermesOnly,
    [switch]$BizraOnly,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
# Automatically detect root based on script location
$BIZRA_ROOT = Resolve-Path "$PSScriptRoot\.."
$HERMES_ROOT = "C:\HERMES project"
$EVIDENCE_ROOT = "C:\bizra-home\evidence"

# Colors
function Write-Status { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "📌 $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# Banner
Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║         BIZRA UNIFIED HOME BASE - SOVEREIGN STARTUP              ║
║                                                                  ║
║  🏠 Genesis Node (3000) + 💎 HERMES Finance (8080)               ║
║  🤖 Ollama AI (11434) + 🗄️  PostgreSQL (5432) + ⚡ Redis (6379)  ║
╚══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# Ensure evidence directory exists
if (-not (Test-Path $EVIDENCE_ROOT)) {
    New-Item -ItemType Directory -Path $EVIDENCE_ROOT -Force | Out-Null
    Write-Info "Created shared evidence store: $EVIDENCE_ROOT"
}

# ========== STEP 1: Docker Services ==========
if (-not $SkipDocker) {
    Write-Info "Starting Docker services (PostgreSQL, Redis)..."
    
    Set-Location $BIZRA_ROOT
    
    # Check if docker-compose exists
    if (Test-Path "docker-compose.yml") {
        docker-compose up -d postgres redis
        
        # Wait for PostgreSQL
        Write-Info "Waiting for PostgreSQL to be ready..."
        $attempts = 0
        while ($attempts -lt 30) {
            $result = docker-compose exec -T postgres pg_isready -U postgres 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Status "PostgreSQL is ready"
                break
            }
            Start-Sleep -Seconds 1
            $attempts++
        }
        
        # Wait for Redis
        Write-Info "Waiting for Redis to be ready..."
        $attempts = 0
        while ($attempts -lt 30) {
            $result = docker-compose exec -T redis redis-cli ping 2>$null
            if ($result -eq "PONG") {
                Write-Status "Redis is ready"
                break
            }
            Start-Sleep -Seconds 1
            $attempts++
        }
    } else {
        Write-Warn "docker-compose.yml not found, skipping Docker services"
    }
} else {
    Write-Warn "Skipping Docker services (--SkipDocker)"
}

# ========== STEP 2: Ollama Local AI ==========
if (-not $SkipOllama) {
    Write-Info "Checking Ollama status..."
    
    $ollamaRunning = $false
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        $ollamaRunning = $true
        Write-Status "Ollama is already running"
        
        if ($response.models) {
            Write-Info "Available models: $($response.models.name -join ', ')"
        }
    } catch {
        Write-Info "Starting Ollama..."
        try {
            Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep -Seconds 5
            
            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 10 | Out-Null
            Write-Status "Ollama started successfully"
        } catch {
            Write-Warn "Ollama may not be installed or failed to start"
        }
    }
} else {
    Write-Warn "Skipping Ollama (--SkipOllama)"
}

# ========== STEP 3: BIZRA Genesis Node ==========
if (-not $HermesOnly) {
    Write-Info "Starting BIZRA Genesis Node..."
    
    Set-Location $BIZRA_ROOT
    
    # Check if Cargo.toml exists
    if (Test-Path "Cargo.toml") {
        # Start in background
        $bizraJob = Start-Job -ScriptBlock {
            param($root)
            Set-Location $root
            cargo run --release 2>&1
        } -ArgumentList $BIZRA_ROOT
        
        Write-Info "BIZRA Genesis starting in background (Job ID: $($bizraJob.Id))"
        
        # Wait for health
        Start-Sleep -Seconds 3
        $attempts = 0
        while ($attempts -lt 30) {
            try {
                $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 2
                Write-Status "BIZRA Genesis Node is ready on port 3000"
                break
            } catch {
                Start-Sleep -Seconds 2
                $attempts++
            }
        }
        
        if ($attempts -ge 30) {
            Write-Warn "BIZRA Genesis may still be starting..."
        }
    } else {
        Write-Err "Cargo.toml not found in $BIZRA_ROOT"
    }
} else {
    Write-Warn "Skipping BIZRA Genesis (--HermesOnly)"
}

# ========== STEP 4: HERMES Finance Service ==========
if (-not $BizraOnly) {
    Write-Info "Starting HERMES Finance Diamond v0..."
    
    $hermesPath = Join-Path $HERMES_ROOT "crates\finance-v0"
    
    if (Test-Path (Join-Path $hermesPath "Cargo.toml")) {
        Set-Location $hermesPath
        
        # Start in background
        $hermesJob = Start-Job -ScriptBlock {
            param($root)
            Set-Location $root
            cargo run --release 2>&1
        } -ArgumentList $hermesPath
        
        Write-Info "HERMES Finance starting in background (Job ID: $($hermesJob.Id))"
        
        # Wait for health
        Start-Sleep -Seconds 3
        $attempts = 0
        while ($attempts -lt 30) {
            try {
                $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get -TimeoutSec 2
                Write-Status "HERMES Finance v0 is ready on port 8080"
                break
            } catch {
                Start-Sleep -Seconds 2
                $attempts++
            }
        }
        
        if ($attempts -ge 30) {
            Write-Warn "HERMES Finance may still be starting..."
        }
    } else {
        Write-Err "HERMES finance-v0 not found at $hermesPath"
    }
} else {
    Write-Warn "Skipping HERMES Finance (--BizraOnly)"
}

# ========== STEP 5: Status Summary ==========
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "              BIZRA UNIFIED HOME BASE STATUS                   " -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta

$services = @(
    @{ Name = "BIZRA Genesis Node"; Port = 3000; Endpoint = "http://localhost:3000/health" },
    @{ Name = "HERMES Finance v0"; Port = 8080; Endpoint = "http://localhost:8080/health" },
    @{ Name = "Ollama AI"; Port = 11434; Endpoint = "http://localhost:11434/api/tags" },
    @{ Name = "PostgreSQL"; Port = 5432; Check = "docker" },
    @{ Name = "Redis"; Port = 6379; Check = "docker" }
)

foreach ($svc in $services) {
    $status = "❌ OFFLINE"
    try {
        if ($svc.Check -eq "docker") {
            # Docker service check
            $netstat = netstat -an | Select-String ":$($svc.Port).*LISTENING"
            if ($netstat) { $status = "✅ RUNNING" }
        } else {
            Invoke-RestMethod -Uri $svc.Endpoint -Method Get -TimeoutSec 2 | Out-Null
            $status = "✅ RUNNING"
        }
    } catch {
        $status = "⏳ STARTING"
    }
    
    Write-Host "  $($svc.Name.PadRight(20)) | Port: $($svc.Port) | $status"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "🌐 Gateway (when nginx started): http://localhost (80/443)"
Write-Host "📊 Dashboard: http://localhost:3000/dashboard"
Write-Host "📁 Evidence Store: $EVIDENCE_ROOT"
Write-Host ""
Write-Host "To stop all services: .\scripts\stop-unified-home-base.ps1" -ForegroundColor Gray
Write-Host ""

# Return to original directory
Set-Location $BIZRA_ROOT
