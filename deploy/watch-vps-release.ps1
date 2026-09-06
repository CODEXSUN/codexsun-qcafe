[CmdletBinding()]
param(
  [switch]$Watch,
  [int]$IntervalSeconds = 15,
  [string]$VpsHost = "root@69.62.81.166",
  [string]$KeyPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/vps-914719-ed25519",
  [string]$KnownHostsPath = "E:/Workspace/codexsun/devkit/storage/devkit/hostinger-ssh/known_hosts"
)

$ErrorActionPreference = "Stop"
$sshOptions = @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=$KnownHostsPath")
do {
  & ssh @sshOptions $VpsHost 'cat /home/codexsun-os/deploy/state/release.json; docker compose -f /home/codexsun-os/deploy/compose.json ps --format "{{.Service}} {{.Image}} {{.Status}}"'
  if ($Watch) { Start-Sleep -Seconds $IntervalSeconds }
} while ($Watch)
