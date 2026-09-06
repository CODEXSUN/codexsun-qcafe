[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string]$Title,
  [switch]$DatabaseUpdate,
  [switch]$SkipDesktop,
  [switch]$SkipDeviceNotification
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-ReleaseStep([string]$Name, [scriptblock]$Action) {
  Write-Host "`n== $Name =="
  & $Action
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." }
}

Push-Location $root
try {
  Invoke-ReleaseStep "Validate working tree" { git diff --check }
  $databaseFlag = if ($DatabaseUpdate) { "--database-update" } else { "--no-database-update" }
  Invoke-ReleaseStep "Create release log" { & npm.cmd run version:bump -- --title $Title $databaseFlag }
  $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
  Invoke-ReleaseStep "Run checks" { & npm.cmd run check }
  if (-not $SkipDesktop) { Invoke-ReleaseStep "Build Zetro Desk" { & npm.cmd run build:desktop } }
  Invoke-ReleaseStep "Commit and publish source" {
    git add -A
    git commit -m "#$($version.Split('.')[-1]) - $Title"
    git tag -a "v-$version" -m "v $version"
    git push origin main --follow-tags
  }
  if (-not $SkipDeviceNotification) { & node deploy/notify-release.mjs --phase published --version $version }
  Invoke-ReleaseStep "Deploy cloud release" { & powershell -ExecutionPolicy Bypass -File deploy/publish-vps.ps1 }
  if (-not $SkipDeviceNotification) { & node deploy/notify-release.mjs --phase running --version $version }
  & powershell -ExecutionPolicy Bypass -File deploy/watch-vps-release.ps1
} finally {
  Pop-Location
}
