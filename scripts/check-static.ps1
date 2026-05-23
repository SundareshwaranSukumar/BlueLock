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
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & .venv\Scripts\python.exe -m pip install -q -r requirements-dev.txt 2>&1 | Out-Null
    $ErrorActionPreference = $prevEap
}
.venv\Scripts\python.exe -m ruff check .
.venv\Scripts\python.exe -m ruff format --check .
Write-Host "=== Backend: Mypy ===" -ForegroundColor Cyan
.venv\Scripts\python.exe -m mypy .
Pop-Location

Write-Host "=== Frontend: ESLint ===" -ForegroundColor Cyan
& (Join-Path $Root "scripts\ensure-node.ps1")
Push-Location frontend
if (Get-Command bun -ErrorAction SilentlyContinue) {
    bun install
    bun run lint
} else {
    npm install
    npm run lint
}

Write-Host "=== Frontend: Production build ===" -ForegroundColor Cyan
if (Get-Command bun -ErrorAction SilentlyContinue) {
    bun run build:production
} else {
    npm run build:production
}
Pop-Location

Write-Host "All static checks passed." -ForegroundColor Green
