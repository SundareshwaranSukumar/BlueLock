# Run static analysis and production builds for BlueLock
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== Backend: Ruff ===" -ForegroundColor Cyan
Push-Location backend
if (-not (Test-Path .venv\Scripts\python.exe)) {
    python -m venv .venv
    .venv\Scripts\python.exe -m pip install -q -r requirements.txt -r requirements-dev.txt
} else {
    .venv\Scripts\python.exe -m pip install -q -r requirements-dev.txt 2>$null
}
.venv\Scripts\python.exe -m ruff check .
.venv\Scripts\python.exe -m ruff format --check .
Write-Host "=== Backend: Mypy ===" -ForegroundColor Cyan
.venv\Scripts\python.exe -m mypy .
Pop-Location

Write-Host "=== Frontend: Production build ===" -ForegroundColor Cyan
& (Join-Path $Root "scripts\ensure-node.ps1")
Push-Location frontend
if (Get-Command bun -ErrorAction SilentlyContinue) {
    bun install
    bun run build:firebase
} else {
    npm install
    npm run build:firebase
}
Pop-Location

Write-Host "All static checks passed." -ForegroundColor Green
