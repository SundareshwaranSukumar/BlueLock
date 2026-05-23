# BlueLock — build frontend and deploy to Firebase Hosting
param(
    [string]$ProjectId = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Error "firebase CLI not found. Install: npm install -g firebase-tools"
}

if ($ProjectId) {
    @"
{
  `"projects`": { `"default`": `"$ProjectId`" }
}
"@ | Set-Content -Path ".firebaserc" -Encoding utf8
}

if (-not (Test-Path ".firebaserc")) {
    Write-Error "Missing .firebaserc. Copy .firebaserc.example or pass -ProjectId."
}

& (Join-Path $Root "scripts\ensure-node.ps1")

if (-not $SkipBuild) {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Push-Location frontend
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        bun install
        bun run build:firebase
    } else {
        npm install
        npm run build:firebase
    }
    Pop-Location
}

$clientDir = Join-Path $Root "frontend\dist\client"
if (-not (Test-Path $clientDir)) {
    Write-Error "Build output not found at $clientDir. Check TanStack build output path."
}

Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting
Write-Host "Done." -ForegroundColor Green
