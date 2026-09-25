# Build-Release-ZIP.ps1
# Run from your SD Dynamics project root (folder with package.json).
# Creates the SAME layout as official Free-GST-Billing.zip so the HTA works.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $Root 'package.json'))) {
  Write-Host 'Run this script from the project folder that contains package.json.'
  exit 1
}
Set-Location $Root

Write-Host 'Building UI...'
if (-not (Test-Path 'dist\index.html')) {
  npm run build
}

$Desktop = [Environment]::GetFolderPath('Desktop')
$Stage = Join-Path $Desktop 'SD-Dynamics-Release\SD-Dynamics'
if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $Stage '_system') | Out-Null

# Launcher files at root of release
$Pack = Join-Path $Root 'release-pack'
# Prefer files shipped in this template next to script
$Template = $Root
Copy-Item (Join-Path $Template 'SD Dynamics - WINDOWS.hta') $Stage -ErrorAction SilentlyContinue
if (-not (Test-Path (Join-Path $Stage 'SD Dynamics - WINDOWS.hta'))) {
  Write-Host 'Place SD Dynamics - WINDOWS.hta in project root first (from the fix ZIP).'
}

Copy-Item (Join-Path $Template 'READ ME FIRST.txt') $Stage -ErrorAction SilentlyContinue

# Scripts into _system
$sys = Join-Path $Stage '_system'
foreach ($f in @(
  'install-windows.ps1','start-windows.ps1','stop-windows.ps1',
  'update-windows.ps1','backup-windows.ps1','restore-windows.ps1',
  'move-windows.ps1','app-icon.ico'
)) {
  $src = Join-Path $Template $f
  if (-not (Test-Path $src)) { $src = Join-Path $Template '_system' $f }
  if (Test-Path $src) { Copy-Item $src $sys -Force }
}

# App runtime into _system
Copy-Item (Join-Path $Root 'package.json') $sys -Force
Copy-Item (Join-Path $Root 'package-lock.json') $sys -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $Root 'server.js') $sys -Force
Copy-Item (Join-Path $Root 'dist') (Join-Path $sys 'dist') -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $sys 'src') -Force | Out-Null
if (Test-Path (Join-Path $Root 'src\utils.js')) {
  Copy-Item (Join-Path $Root 'src\utils.js') (Join-Path $sys 'src\utils.js') -Force
}
if (Test-Path (Join-Path $Root 'scripts')) {
  Copy-Item (Join-Path $Root 'scripts') (Join-Path $sys 'scripts') -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $sys 'data') -Force | Out-Null

# Full src needed if user might rebuild - optional large copy
# Copy-Item (Join-Path $Root 'src') (Join-Path $sys 'src') -Recurse -Force

Write-Host ''
Write-Host "Release folder ready:"
Write-Host "  $Stage"
Write-Host ''
Write-Host 'Open that folder and double-click: SD Dynamics - WINDOWS.hta'
Write-Host 'First time: click Install. Then Open App.'
explorer.exe (Split-Path $Stage)
