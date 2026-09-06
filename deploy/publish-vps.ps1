[CmdletBinding()]
param(
  [string]$VpsHost = "root@69.62.81.166",
  [string]$KeyPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/vps-914719-ed25519",
  [string]$KnownHostsPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/known_hosts"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$archive = Join-Path $root ".local/codexsun-cloud-source.tgz"
$portalArchive = Join-Path $root ".local/codexsun-portal.tgz"
$runner = Join-Path $root "deploy/apply-vps.sh"
$sshOptions = @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=$KnownHostsPath")

Push-Location $root
try {
  $env:VITE_OS_CLOUD = "true"
  $env:VITE_OS_API_URL = "https://os.codexsun.com"
  $env:VITE_CHAT_API_URL = "https://os.codexsun.com"
  & npm.cmd run build -w @codexsun/core-web
  & tar -czf $portalArchive -C (Join-Path $root "apps/platform/core/web/dist") .
  node deploy/package-source.mjs
  & scp @sshOptions $archive "$VpsHost`:/tmp/codexsun-cloud-source.tgz"
  & scp @sshOptions $portalArchive "$VpsHost`:/tmp/codexsun-portal.tgz"
  & scp @sshOptions $runner "$VpsHost`:/tmp/codexsun-apply-vps.sh"
  & ssh @sshOptions $VpsHost "bash /tmp/codexsun-apply-vps.sh /tmp/codexsun-cloud-source.tgz /tmp/codexsun-portal.tgz"
} finally {
  Pop-Location
}
