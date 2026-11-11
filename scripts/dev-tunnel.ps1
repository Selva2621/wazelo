<#
  Public https address for local Instagram testing (Meta needs https for login + webhooks).

  Starts a free cloudflared quick tunnel to the frontend (localhost:3000). The frontend
  proxies /api/v1 to the backend (BACKEND_URL), so this one address serves the app, the
  Instagram login redirect, Meta's webhook and the media Instagram downloads.

  The address changes every time the tunnel starts: run this script, then restart the
  backend (it reads .env at start) and paste the printed values into the Meta app.

  Usage:  powershell -ExecutionPolicy Bypass -File scripts\dev-tunnel.ps1
  Stop:   Stop-Process -Id (Get-Content .tools\tunnel.pid)
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root '.tools'
$exe = Join-Path $tools 'cloudflared.exe'
$log = Join-Path $tools 'tunnel.log'
$pidFile = Join-Path $tools 'tunnel.pid'
$backendEnv = Join-Path $root 'backend\.env'
$frontendEnv = Join-Path $root 'frontend\.env.local'

if (-not (Test-Path $exe)) { throw "cloudflared not found at $exe" }

# Set KEY=value in an env file (adds the line when missing). Values are never printed.
function Set-EnvValue([string]$file, [string]$key, [string]$value) {
  $lines = if (Test-Path $file) { @(Get-Content $file) } else { @() }
  $found = $false
  $out = foreach ($l in $lines) {
    if ($l -match "^$([regex]::Escape($key))=") { $found = $true; "$key=$value" } else { $l }
  }
  if (-not $found) { $out = @($out) + "$key=$value" }
  # UTF-8 without BOM: a BOM would break the first key for dotenv
  [System.IO.File]::WriteAllLines($file, [string[]]$out, (New-Object System.Text.UTF8Encoding $false))
}
function Get-EnvValue([string]$file, [string]$key) {
  $line = Get-Content $file -ErrorAction SilentlyContinue | Where-Object { $_ -match "^$([regex]::Escape($key))=" } | Select-Object -First 1
  if ($line) { return ($line -split '=', 2)[1] } else { return '' }
}

# One-time backups before the first change
foreach ($f in @($backendEnv, $frontendEnv)) {
  $bak = "$f.before-tunnel"
  if ((Test-Path $f) -and -not (Test-Path $bak)) { Copy-Item $f $bak }
}

# Stop a tunnel left from an earlier run
if (Test-Path $pidFile) {
  $old = Get-Content $pidFile
  Stop-Process -Id $old -ErrorAction SilentlyContinue
}
if (Test-Path $log) { Remove-Item $log -Force }

$proc = Start-Process -FilePath $exe -ArgumentList @('tunnel', '--no-autoupdate', '--url', 'http://localhost:3000', '--logfile', $log) -WindowStyle Hidden -PassThru
Set-Content $pidFile $proc.Id

# Wait for the public address
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { throw "Tunnel didn't start in 60s. See $log" }

# Backend: public address for media + the Instagram login redirect
Set-EnvValue $backendEnv 'API_PUBLIC_URL' "$url/api/v1"
Set-EnvValue $backendEnv 'INSTAGRAM_REDIRECT_URI' "$url/settings/channels/instagram-callback"
if (-not (Get-EnvValue $backendEnv 'INSTAGRAM_WEBHOOK_VERIFY_TOKEN')) {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Set-EnvValue $backendEnv 'INSTAGRAM_WEBHOOK_VERIFY_TOKEN' ([Convert]::ToBase64String($bytes) -replace '[+/=]', '')
}
foreach ($k in 'INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET') {
  if (-not (Select-String -Path $backendEnv -Pattern "^$k=" -Quiet)) { Set-EnvValue $backendEnv $k '' }
}

# Frontend: call the API on its own address (the tunnel), proxied to the backend
Set-EnvValue $frontendEnv 'NEXT_PUBLIC_API_URL' '/api/v1'
Set-EnvValue $frontendEnv 'BACKEND_URL' 'http://localhost:8080'

Write-Host ''
Write-Host "Tunnel: $url" -ForegroundColor Green
Write-Host ''
Write-Host 'Open the app at the tunnel address above and log in there.'
Write-Host 'Restart backend and frontend so they read the new settings.'
Write-Host ''
Write-Host 'Meta app (developers.facebook.com > your app > Instagram > API setup with Instagram login):'
Write-Host "  OAuth redirect URL : $url/settings/channels/instagram-callback"
Write-Host "  Webhook callback   : $url/api/v1/webhooks/meta/instagram"
Write-Host '  Webhook verify token: the INSTAGRAM_WEBHOOK_VERIFY_TOKEN value in backend\.env'
Write-Host '  Webhook fields     : messages, messaging_postbacks, messaging_seen, message_reactions, comments'
if (-not (Get-EnvValue $backendEnv 'INSTAGRAM_APP_ID')) {
  Write-Host ''
  Write-Host 'Still missing: INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in backend\.env' -ForegroundColor Yellow
}
