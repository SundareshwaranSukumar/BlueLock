# BlueLock — deploy backend to Cloud Run, then Firebase Hosting (recommended production path)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$envPath = Join-Path $Root ".env"
if (-not (Test-Path $envPath)) {
    throw "Missing $envPath — copy .env.template to .env"
}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path "env:$key" -Value $val
}

$project = if ($env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID } else { $env:GCP_PROJECT_ID }
if (-not $project) { throw "Set FIREBASE_PROJECT_ID or GCP_PROJECT_ID in .env" }

if (-not $env:CORS_ORIGINS) {
    $env:CORS_ORIGINS = "https://$project.web.app,https://$project.firebaseapp.com"
    Write-Host "CORS_ORIGINS=$($env:CORS_ORIGINS) (override in .env to customize)" -ForegroundColor Yellow
}

Write-Host "=== Step 1/2: Cloud Run backend ===" -ForegroundColor Cyan
$env:DEPLOY_ONLY = "backend"
& (Join-Path $Root "scripts\deploy-gcp.ps1")

Write-Host ""
Write-Host "=== Step 2/2: Firebase Hosting ===" -ForegroundColor Cyan
& (Join-Path $Root "scripts\deploy-firebase.ps1")
