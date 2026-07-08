<#
  Starts the backend and frontend together, waits for each to be ready
  before starting the next, keeps their output out of the console, and
  prints the URL to open once everything is up.
#>

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logDir = Join-Path $root '.run-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$backendLog = Join-Path $logDir 'backend.log'
$frontendLog = Join-Path $logDir 'frontend.log'
$backendHealthUrl = 'http://localhost:5000/api/health'
$frontendUrl = 'http://localhost:3000'

function Wait-ForPort($port, $timeoutSeconds) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSeconds) {
        $code = & curl.exe -s -o NUL -w '%{http_code}' --max-time 2 "http://127.0.0.1:$port/" 2>$null
        if ($code -match '^\d{3}$') {
            Write-Host " (took $([math]::Round($sw.Elapsed.TotalSeconds, 1))s)" -NoNewline
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

if (-not (Test-Path (Join-Path $root 'backend\.env'))) {
    Write-Host "Warning: backend\.env not found. The backend will likely fail to connect to the database." -ForegroundColor Yellow
    Write-Host "Create it first (see README) then re-run this script." -ForegroundColor Yellow
}

Write-Host "Starting backend..." -NoNewline

Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'dev', '--prefix', 'backend' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $backendLog `
    -RedirectStandardError "$backendLog.err" `
    -PassThru | Out-Null

if (Wait-ForPort 5000 30) {
    Write-Host " ready." -ForegroundColor Green
} else {
    Write-Host " FAILED to start within 30s. Check $backendLog and $backendLog.err" -ForegroundColor Red
    exit 1
}

Write-Host "Starting frontend..." -NoNewline

Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'dev', '--prefix', 'frontend' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $frontendLog `
    -RedirectStandardError "$frontendLog.err" | Out-Null

if (Wait-ForPort 3000 60) {
    Write-Host " ready." -ForegroundColor Green
} else {
    Write-Host " FAILED to start within 60s. Check $frontendLog and $frontendLog.err" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "AttendanceOS is running:" -ForegroundColor Cyan
Write-Host "  App:      $frontendUrl" -ForegroundColor Cyan
Write-Host "  API:      $backendHealthUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Logs: $logDir"
Write-Host "To stop both servers, run: .\stop.ps1"
