<#
  Stops whatever is listening on the backend (5000) and frontend (3000)
  ports, regardless of how they were started.
#>

function Stop-Port($port) {
    $lines = netstat -ano | Select-String ":$port\s" | Select-String 'LISTENING'
    $pids = $lines | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique
    foreach ($processId in $pids) {
        try {
            taskkill /F /PID $processId | Out-Null
            Write-Host "Stopped process $processId on port $port" -ForegroundColor Green
        } catch {
            Write-Host "Could not stop process $processId on port $port" -ForegroundColor Yellow
        }
    }
    if (-not $pids) {
        Write-Host "Nothing listening on port $port" -ForegroundColor DarkGray
    }
}

Stop-Port 5000
Stop-Port 3000
