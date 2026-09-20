#Requires -Version 5.1

$ErrorActionPreference = 'Stop'

function Get-PlainText {
  param([System.Security.SecureString]$Secure)
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$InstallDir = 'C:\repro-publicidad'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host '=== Instalador de Repro Publicidad (Windows) ===' -ForegroundColor Cyan
Write-Host "Origen:  $ProjectRoot"
Write-Host "Destino: $InstallDir"
Write-Host ''

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: no se encontró winget (App Installer de Windows). Actualizá Windows o instalá Node.js y MongoDB manualmente.' -ForegroundColor Red
  exit 1
}

Write-Host '1) Instalando Node.js (si falta)...'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements | Out-Host
  $env:Path = "$env:ProgramFiles\nodejs;$env:Path"
}
node -v

Write-Host '2) Instalando MongoDB (si falta)...'
if (-not (Get-Service 'MongoDB' -ErrorAction SilentlyContinue)) {
  winget install --id MongoDB.Server -e --accept-source-agreements --accept-package-agreements | Out-Host
}
Start-Sleep -Seconds 2
if (-not (Get-Service 'MongoDB' -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: MongoDB no se instaló. Descargalo manualmente de https://www.mongodb.com/try/download/community y volvé a correr este instalador.' -ForegroundColor Red
  exit 1
}
Start-Service 'MongoDB' -ErrorAction SilentlyContinue
Write-Host '  MongoDB OK.'

$adminUser = Read-Host 'Usuario administrador del panel [admin]'
if ([string]::IsNullOrWhiteSpace($adminUser)) { $adminUser = 'admin' }
$pass1 = Read-Host -AsSecureString 'Contraseña de administrador del panel'
$pass2 = Read-Host -AsSecureString 'Repetí la contraseña'
$plain1 = Get-PlainText $pass1
$plain2 = Get-PlainText $pass2
if ($plain1 -ne $plain2) {
  Write-Host 'ERROR: las contraseñas no coinciden.' -ForegroundColor Red
  exit 1
}
if ($plain1 -match '[\s#]') {
  Write-Host 'ERROR: la contraseña no puede contener espacios ni el carácter #.' -ForegroundColor Red
  exit 1
}

Write-Host "3) Copiando proyecto a $InstallDir..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
robocopy $ProjectRoot $InstallDir /E /XD node_modules .git uploads public dist deploy /XF .env | Out-Null
if ($LASTEXITCODE -ge 8) {
  Write-Host 'ERROR: no se pudo copiar el proyecto.' -ForegroundColor Red
  exit 1
}

Write-Host '4) Configurando .env...'
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
@"
PORT=3000
MONGO_URL=mongodb://127.0.0.1:27017/repro-publicidad
JWT_SECRET=$secret
ADMIN_USERNAME=$adminUser
ADMIN_PASSWORD=$plain1
"@ | Set-Content -Path (Join-Path $InstallDir '.env') -Encoding ASCII

Write-Host '5) Instalando dependencias y compilando...'
Push-Location $InstallDir
try {
  npm ci --no-audit --no-fund
  npm run build
  npm run seed --prefix apps/server
} finally {
  Pop-Location
}

Write-Host '6) Dejando el arranque automático...'
$nodeExe = (Get-Command node).Source
$serverDir = Join-Path $InstallDir 'apps\server'
$entry = Join-Path $serverDir 'dist\index.js'

$nssmInstalled = $false
try {
  $nssmZip = Join-Path $env:TEMP 'nssm.zip'
  $nssmDir = Join-Path $env:TEMP 'nssm-extract'
  Invoke-WebRequest -Uri 'https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip' -OutFile $nssmZip -UseBasicParsing
  if (Test-Path $nssmDir) { Remove-Item $nssmDir -Recurse -Force }
  Expand-Archive -Path $nssmZip -DestinationPath $nssmDir -Force
  $nssm = Get-ChildItem $nssmDir -Recurse -Filter 'nssm.exe' | Where-Object { $_.FullName -match 'win64' } | Select-Object -First 1 -ExpandProperty FullName
  & $nssm install 'repro-publicidad' $nodeExe $entry | Out-Host
  & $nssm set 'repro-publicidad' AppDirectory $serverDir | Out-Null
  & $nssm set 'repro-publicidad' Start SERVICE_AUTO_START | Out-Null
  & $nssm set 'repro-publicidad' AppStdout (Join-Path $InstallDir 'server.log') | Out-Null
  & $nssm set 'repro-publicidad' AppStderr (Join-Path $InstallDir 'server.err.log') | Out-Null
  & $nssm start 'repro-publicidad' | Out-Host
  $nssmInstalled = $true
} catch {
  Write-Host '  NSSM no disponible; usando Tarea programada al inicio...' -ForegroundColor Yellow
  $startCmd = "@echo off`r`ncd /d `"$serverDir`"`r`nnode dist\index.js`r`n"
  Set-Content -Path (Join-Path $InstallDir 'start.cmd') -Value $startCmd -Encoding ASCII
  schtasks /Create /TN 'repro-publicidad' /SC ONSTART /RL HIGHEST /RU SYSTEM /TR "$(Join-Path $InstallDir 'start.cmd')" | Out-Host
  schtasks /Run /TN 'repro-publicidad' | Out-Host
}

Write-Host '7) Abriendo el puerto 3000 en el firewall...'
if (-not (Get-NetFirewallRule -DisplayName 'Repro Publicidad' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'Repro Publicidad' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private | Out-Null
}

Start-Sleep -Seconds 4
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = '<IP de esta PC>' }

Write-Host ''
Write-Host '==================== INSTALACIÓN COMPLETA ====================' -ForegroundColor Green
Write-Host "  Panel administrativo:  http://$ip`:3000/panel"
Write-Host "  Player (pantallas):    http://$ip`:3000/player"
Write-Host "  Usuario admin:         $adminUser"
Write-Host '=============================================================='
Write-Host 'Para ver en las pantallas, abrí el navegador del TV con la URL del player.'
Write-Host 'La PC debe quedar prendida y en la misma red que los televisores.'