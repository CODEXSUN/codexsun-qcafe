[CmdletBinding()]
param(
  [switch]$SkipWebBuild,
  [switch]$SkipImageBuild
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..")).Path
$composeFile = Join-Path $PSScriptRoot "compose.json"
$runtimeUrl = "http://127.0.0.1:4230/"

function Invoke-ZxaCommand {
  param([string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
}

Push-Location $repositoryRoot
try {
  if (-not $SkipWebBuild) {
    & npm.cmd run build -w @codexsun/zxa-web
    if ($LASTEXITCODE -ne 0) {
      throw "ZXA web build failed."
    }
  }

  $composeArguments = @("compose", "-f", $composeFile, "up", "-d", "--force-recreate", "--wait")
  if (-not $SkipImageBuild) {
    $composeArguments += "--build"
  }
  $lastSetupError = $null
  for ($attempt = 1; $attempt -le 2; $attempt += 1) {
    try {
      Invoke-ZxaCommand -Arguments $composeArguments
      $lastSetupError = $null
      break
    }
    catch {
      $lastSetupError = $_
      if ($attempt -eq 1) {
        Write-Warning "Docker did not finish the first setup attempt. Retrying once."
        Start-Sleep -Seconds 5
      }
    }
  }
  if ($null -ne $lastSetupError) {
    throw $lastSetupError
  }

  $response = Invoke-WebRequest -UseBasicParsing -Uri $runtimeUrl -TimeoutSec 15
  if ($response.StatusCode -ne 200 -or $response.Content -notmatch "ZXA") {
    throw "ZXA is healthy but the local connection page was not returned."
  }

  Write-Host "ZXA is ready: $runtimeUrl" -ForegroundColor Green
  Write-Host "Open this page to connect Codex, Gemini, or OpenCode." -ForegroundColor Green
}
finally {
  Pop-Location
}
