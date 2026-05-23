# BlueLock interactive launcher (Windows PowerShell)
param(
    [ValidateSet("local", "gcp", "firebase", "frontend", "backend", "containers", "health", "menu")]
    [string]$Action = "menu"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$BackendUrl = "http://127.0.0.1:8000"

function Write-Menu {
    Write-Host ""
    Write-Host "BlueLock Launcher" -ForegroundColor Cyan
    Write-Host "  1) Local full stack (Docker backend + frontend dev)"
    Write-Host "  2) Deploy GCP (Cloud Run — backend + frontend)"
    Write-Host "  2b) Deploy Firebase (Cloud Run backend + Hosting)"
    Write-Host "  3) Frontend only"
    Write-Host "  4) Backend only"
    Write-Host "  5) Validate Docker containers"
    Write-Host "  6) Health status (backend + optional frontend)"
    Write-Host "  7) Build all (verify compile)"
    Write-Host "  0) Exit"
    Write-Host ""
}

function Ensure-BackendEnv {
    $envFile = Join-Path $BackendDir ".env"
    $template = Join-Path $BackendDir ".env.template"
    if (-not (Test-Path $envFile) -and (Test-Path $template)) {
        Copy-Item $template $envFile
        Write-Host "Created backend/.env from template — set GEMINI_API_KEY for AI routes." -ForegroundColor Yellow
    }
}

function Start-BackendDocker {
    Ensure-BackendEnv
    Set-Location $Root
    docker compose up -d --build backend
    Write-Host "Backend container starting on $BackendUrl" -ForegroundColor Green
}

function Start-BackendLocal {
    Ensure-BackendEnv
    $venvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        python -m venv (Join-Path $BackendDir ".venv")
        & (Join-Path $BackendDir ".venv\Scripts\pip.exe") install -r (Join-Path $BackendDir "requirements.txt")
    }
    Start-Process -FilePath (Join-Path $BackendDir ".venv\Scripts\python.exe") `
        -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" `
        -WorkingDirectory $BackendDir -WindowStyle Normal
    Write-Host "Uvicorn started in new window on $BackendUrl" -ForegroundColor Green
}

function Start-Frontend {
    $envLocal = Join-Path $FrontendDir ".env.local"
    if (-not (Test-Path $envLocal)) {
        Copy-Item (Join-Path $FrontendDir ".env.example") $envLocal
    }
    Set-Location $FrontendDir
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        bun install
        $env:VITE_USE_BACKEND = "true"
        $env:BACKEND_URL = $BackendUrl
        $env:USE_BACKEND = "true"
        bun run dev
    } else {
        npm install
        $env:VITE_USE_BACKEND = "true"
        $env:BACKEND_URL = $BackendUrl
        $env:USE_BACKEND = "true"
        npm run dev
    }
}

function Test-Health {
    param([string]$Url, [string]$Label)
    try {
        $r = Invoke-RestMethod -Uri $Url -TimeoutSec 5
        Write-Host "[OK] $Label" -ForegroundColor Green
        $r | ConvertTo-Json -Compress
    } catch {
        Write-Host "[FAIL] $Label — $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-Containers {
    Set-Location $Root
    $ps = docker compose ps 2>&1
    Write-Host $ps
    $running = docker compose ps --status running -q 2>$null
    if ($running) {
        Write-Host "Container(s) running." -ForegroundColor Green
        docker compose ps
    } else {
        Write-Host "No running BlueLock containers." -ForegroundColor Yellow
    }
}

function Build-All {
    Write-Host "Building backend Docker image..." -ForegroundColor Cyan
    Set-Location $Root
    docker compose build backend
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Push-Location $FrontendDir
    if (Get-Command bun -ErrorAction SilentlyContinue) { bun install; bun run build }
    else { npm install; npm run build }
    Pop-Location
    Write-Host "Build complete." -ForegroundColor Green
}

function Deploy-Gcp {
    & (Join-Path $Root "scripts\deploy-gcp.ps1")
}

function Deploy-Firebase {
    & (Join-Path $Root "scripts\deploy-firebase-full.ps1")
}

function Invoke-Action([string]$choice) {
    switch ($choice) {
        "1" { "local" }
        "2" { "gcp" }
        "2b" { "firebase" }
        "3" { "frontend" }
        "4" { "backend" }
        "5" { "containers" }
        "6" { "health" }
        "7" { "build" }
        "0" { return }
        default { $choice }
    } | ForEach-Object {
        switch ($_) {
            "local" {
                Start-BackendDocker
                Start-Sleep -Seconds 4
                Test-Health "$BackendUrl/health" "Backend /health"
                Start-Frontend
            }
            "gcp" { Deploy-Gcp }
            "firebase" { Deploy-Firebase }
            "frontend" { Start-Frontend }
            "backend" {
                if (Get-Command docker -ErrorAction SilentlyContinue) { Start-BackendDocker }
                else { Start-BackendLocal }
            }
            "containers" { Test-Containers }
            "health" {
                Test-Health "$BackendUrl/health" "Backend /health"
                Test-Health "$BackendUrl/api/v1/health" "Backend /api/v1/health"
                try {
                    Test-Health "http://127.0.0.1:5173" "Frontend dev (root)"
                } catch { Write-Host "Frontend dev server not detected on :5173" -ForegroundColor Yellow }
            }
            "build" { Build-All }
        }
    }
}

Set-Location $Root

if ($Action -ne "menu") {
    Invoke-Action $Action
    exit 0
}

while ($true) {
    Write-Menu
    $pick = Read-Host "Select option"
    if ($pick -eq "0") { break }
    Invoke-Action $pick
}
