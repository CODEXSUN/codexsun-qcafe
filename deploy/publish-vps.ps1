[CmdletBinding()]
param(
  [string]$Host = "root@69.62.81.166",
  [string]$KeyPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/vps-914719-ed25519",
  [string]$KnownHostsPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/known_hosts"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$archive = Join-Path $root ".local/codexsun-cloud-source.tgz"
$sshOptions = @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=$KnownHostsPath")

Push-Location $root
try {
  node deploy/package-source.mjs
  & scp @sshOptions $archive "$Host`:/tmp/codexsun-cloud-source.tgz"
  & ssh @sshOptions $Host "bash /home/codexsun-os/deploy/apply-vps.sh /tmp/codexsun-cloud-source.tgz"
} finally {
  Pop-Location
}
