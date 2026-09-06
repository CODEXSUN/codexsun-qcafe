[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string]$Title,
  [switch]$DatabaseUpdate,
  [switch]$SkipDesktop,
  [switch]$SkipDeviceNotification,
  [switch]$SkipOrship,
  [string]$OrshipApiUrl = "http://127.0.0.1:4190"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-ReleaseStep([string]$Name, [scriptblock]$Action) {
  Write-Host "`n== $Name =="
  & $Action
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." }
}

function Invoke-OrshipRequest([string]$Path, [string]$Method = "POST", [object]$Body = $null) {
  $parameters = @{ Uri = "$($OrshipApiUrl.TrimEnd('/'))/api/v1/orship$Path"; Method = $Method; ErrorAction = "Stop" }
  if ($null -ne $Body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = $Body | ConvertTo-Json -Depth 6 -Compress
  }
  return Invoke-RestMethod @parameters
}

Push-Location $root
$orshipOperationId = $null
try {
  Invoke-ReleaseStep "Validate working tree" { git diff --check }
  if (-not $SkipOrship) {
    $sourceRevision = (& git rev-parse HEAD).Trim()
    $operation = Invoke-OrshipRequest "" "POST" @{ target = @{ projectKey = "codexsun-os"; repository = "CODEXSUN/codexsun"; environment = "cloud" }; title = $Title; sourceRevision = $sourceRevision; approvalRequired = $false }
    $orshipOperationId = [string]$operation.id
    Write-Host "Orship release record: $orshipOperationId"
  }
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
  if ($orshipOperationId) { Invoke-OrshipRequest "/$orshipOperationId/publish" "POST" @{ version = $version } | Out-Null }
  if (-not $SkipDeviceNotification) { & node deploy/notify-release.mjs --phase published --version $version }
  if ($orshipOperationId) { Invoke-OrshipRequest "/$orshipOperationId/deployment/start" "POST" @{} | Out-Null }
  Invoke-ReleaseStep "Deploy cloud release" { & powershell -ExecutionPolicy Bypass -File deploy/publish-vps.ps1 }
  if ($orshipOperationId) { Invoke-OrshipRequest "/$orshipOperationId/deployment/complete" "POST" @{} | Out-Null }
  if (-not $SkipDeviceNotification) { & node deploy/notify-release.mjs --phase running --version $version }
  & powershell -ExecutionPolicy Bypass -File deploy/watch-vps-release.ps1
} catch {
  if ($orshipOperationId) {
    try { Invoke-OrshipRequest "/$orshipOperationId/fail" "POST" @{ reason = $_.Exception.Message.Substring(0, [Math]::Min(2000, $_.Exception.Message.Length)) } | Out-Null }
    catch { Write-Warning "Orship could not record the release failure: $($_.Exception.Message)" }
  }
  throw
} finally {
  Pop-Location
}
