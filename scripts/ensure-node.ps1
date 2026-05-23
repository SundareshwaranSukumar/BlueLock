# Activate Node from .nvmrc when fnm/nvm-windows/Volta is available; then verify Vite engine.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Nvmrc = Join-Path $Root ".nvmrc"

if (-not (Test-Path $Nvmrc)) {
    Write-Error "Missing .nvmrc at repo root."
}

$Required = (Get-Content $Nvmrc -Raw).Trim().TrimStart("v")
$EnsureScript = Join-Path $Root "scripts\ensure-node.mjs"

function Test-NodeOk {
    & node $EnsureScript --quiet 2>$null
    return $LASTEXITCODE -eq 0
}

if (Test-NodeOk) { return }

Write-Host "Node version below Vite minimum; trying fnm / nvm / Volta..." -ForegroundColor Yellow

if (Get-Command fnm -ErrorAction SilentlyContinue) {
    fnm install $Required --silent-if-installed 2>$null
    if ($LASTEXITCODE -ne 0) { fnm install $Required }
    fnm use $Required
} elseif (Get-Command nvm -ErrorAction SilentlyContinue) {
    nvm install $Required 2>$null
    nvm use $Required
} elseif (Get-Command volta -ErrorAction SilentlyContinue) {
    volta install "node@$Required"
} else {
    Write-Warning "No fnm, nvm, or Volta found. Install Node $Required manually (see .nvmrc)."
}

& node $EnsureScript
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
