[CmdletBinding()]
param(
  [string]$VpsHost = "root@69.62.81.166",
  [string]$KeyPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/vps-914719-ed25519",
  [string]$KnownHostsPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/known_hosts"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$privateConfig = Join-Path $root ".local/first-login-sync.env"
$environment = Get-Content (Join-Path $root ".env") | Where-Object { $_ -match '^OS_FIRST_LOGIN_SETUP(?:_CODE|_EXPIRES_AT)?=' }
Set-Content -Path $privateConfig -Value $environment -Encoding ascii
$sshOptions = @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=$KnownHostsPath")

try {
  & scp @sshOptions $privateConfig "$VpsHost`:/tmp/codexsun-first-login.env"
  & scp @sshOptions (Join-Path $PSScriptRoot "sync-first-login-env.py") "$VpsHost`:/tmp/codexsun-sync-first-login.py"
  & ssh @sshOptions $VpsHost "python3 /tmp/codexsun-sync-first-login.py /tmp/codexsun-first-login.env /home/codexsun-os/deploy/config/operator.env && cd /home/codexsun-os && python3 deploy/bootstrap-vps.py && docker compose -f deploy/compose.json up -d --force-recreate --no-deps platform"
} finally {
  Remove-Item -LiteralPath $privateConfig -Force -ErrorAction SilentlyContinue
}
