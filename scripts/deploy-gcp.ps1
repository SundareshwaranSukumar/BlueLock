# BlueLock - deploy backend + frontend to Google Cloud Run
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

function Get-BackendEnvVars {
    if (-not $env:GEMINI_API_KEY) { throw "Set GEMINI_API_KEY in .env" }
    $pairs = @("GEMINI_API_KEY=$($env:GEMINI_API_KEY)")
    if ($env:GOOGLE_MAPS_API_KEY) { $pairs += "GOOGLE_MAPS_API_KEY=$($env:GOOGLE_MAPS_API_KEY)" }
    if ($env:CRICAPI_KEY) { $pairs += "CRICAPI_KEY=$($env:CRICAPI_KEY)" }
    if ($env:RAPIDAPI_KEY) { $pairs += "RAPIDAPI_KEY=$($env:RAPIDAPI_KEY)" }
    if ($env:CORS_ORIGINS) { $pairs += "CORS_ORIGINS=$($env:CORS_ORIGINS)" }
    return "^;^" + ($pairs -join ";")
}

function ConvertTo-WsUrl([string]$HttpUrl) {
    $base = $HttpUrl.TrimEnd("/")
    if ($base -match "^https://(.+)$") {
        return "wss://$($Matches[1])/api/v1/stadium/live-stream"
    }
    if ($base -match "^http://(.+)$") {
        return "ws://$($Matches[1])/api/v1/stadium/live-stream"
    }
    return "$base/api/v1/stadium/live-stream"
}

Import-RootEnv

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw "gcloud CLI not found. Install Google Cloud SDK."
}
if (-not $env:GCP_PROJECT_ID) { throw "Set GCP_PROJECT_ID in .env" }

$region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
$backendName = if ($env:BACKEND_SERVICE_NAME) { $env:BACKEND_SERVICE_NAME } else { "bluelock-backend" }
$frontendName = if ($env:FRONTEND_SERVICE_NAME) { $env:FRONTEND_SERVICE_NAME } else { "bluelock-frontend" }

Write-Host "=== gcloud auth / project ===" -ForegroundColor Cyan
$active = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $active) { throw "No active gcloud account. Run: gcloud auth login" }
gcloud config set project $env:GCP_PROJECT_ID | Out-Null

Write-Host "=== Enabling APIs ===" -ForegroundColor Cyan
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com `
    --project=$env:GCP_PROJECT_ID

$backendEnv = Get-BackendEnvVars

Write-Host "=== Deploying backend: $backendName ===" -ForegroundColor Cyan
gcloud run deploy $backendName `
    --source $Root `
    --region $region `
    --project $env:GCP_PROJECT_ID `
    --allow-unauthenticated `
    --port 8080 `
    --set-env-vars $backendEnv

$backendUrl = (gcloud run services describe $backendName `
    --region $region `
    --project $env:GCP_PROJECT_ID `
    --format="value(status.url)").TrimEnd("/")

$viteApi = if ($env:VITE_API_BASE_URL) { $env:VITE_API_BASE_URL.TrimEnd("/") } else { $backendUrl }
$viteWs = if ($env:VITE_TELEMETRY_WS_URL) { $env:VITE_TELEMETRY_WS_URL } else { ConvertTo-WsUrl $viteApi }

Write-Host "Backend URL: $backendUrl"

Write-Host "=== Deploying frontend: $frontendName ===" -ForegroundColor Cyan
Write-Host "Frontend build: VITE_API_BASE_URL=$viteApi"

# Swap Dockerfile so Cloud Build uses the frontend one
$backendDocker = Join-Path $Root "Dockerfile"
$backupDocker = Join-Path $Root "Dockerfile.backend"
$frontendDocker = Join-Path $Root "frontend\Dockerfile"
Copy-Item $backendDocker $backupDocker -Force
Copy-Item $frontendDocker $backendDocker -Force
try {
    gcloud run deploy $frontendName `
        --source $Root `
        --region $region `
        --project $env:GCP_PROJECT_ID `
        --allow-unauthenticated `
        --port 8080 `
        --set-build-env-vars "VITE_API_BASE_URL=$viteApi,VITE_USE_BACKEND=true,VITE_TELEMETRY_WS_URL=$viteWs"
} finally {
    Copy-Item $backupDocker $backendDocker -Force
    Remove-Item $backupDocker -Force
}

$frontendUrl = gcloud run services describe $frontendName `
    --region $region `
    --project $env:GCP_PROJECT_ID `
    --format="value(status.url)"

Write-Host ""
Write-Host "Deploy complete." -ForegroundColor Green
Write-Host "  Backend:  $backendUrl"
Write-Host "  Frontend: $frontendUrl"
