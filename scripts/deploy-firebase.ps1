# BlueLock - build static frontend and deploy Firebase Hosting (API via Cloud Run rewrites)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Import-RootEnv {
    $envPath = Join-Path $Root ".env"
    if (-not (Test-Path $envPath)) {
        throw "Missing $envPath - copy .env.template to .env and fill values."
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
}

function Ensure-Firebaserc {
    $project = if ($env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID } else { $env:GCP_PROJECT_ID }
    if (-not $project) { throw "Set FIREBASE_PROJECT_ID or GCP_PROJECT_ID in .env" }
    $rcPath = Join-Path $Root ".firebaserc"
    $obj = @{ projects = @{ default = $project } }
    $obj | ConvertTo-Json -Depth 5 | Set-Content $rcPath -Encoding utf8
}

Import-RootEnv

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    throw "firebase CLI not found. Run: npm install -g firebase-tools"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js required for render-firebase-config.mjs"
}

Ensure-Firebaserc

$firebaseConfig = (node (Join-Path $Root "scripts\render-firebase-config.mjs")).Trim()

Write-Host "=== Node (frontend build) ===" -ForegroundColor Cyan
& (Join-Path $Root "scripts\ensure-node.ps1")

Write-Host "=== Frontend production build (same-origin API via Hosting rewrites) ===" -ForegroundColor Cyan
Set-Location (Join-Path $Root "frontend")
$env:VITE_USE_BACKEND = "true"
Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:VITE_TELEMETRY_WS_URL -ErrorAction SilentlyContinue
if (Get-Command bun -ErrorAction SilentlyContinue) {
    bun install
    bun run build:production
} else {
    npm install
    npm run build:production
}

Write-Host "=== Firebase Hosting deploy ===" -ForegroundColor Cyan
Set-Location $Root
$project = if ($env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID } else { $env:GCP_PROJECT_ID }
firebase deploy --only hosting --config $firebaseConfig --project $project

$backendName = if ($env:BACKEND_SERVICE_NAME) { $env:BACKEND_SERVICE_NAME } else { "bluelock-backend" }
$region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
Write-Host ""
Write-Host "Firebase Hosting deploy complete." -ForegroundColor Green
Write-Host "  Backend must be deployed: $backendName ($region)"
Write-Host "  Full stack: .\scripts\deploy-firebase-full.ps1"
Write-Host "  Hosting URL: https://$project.web.app"
