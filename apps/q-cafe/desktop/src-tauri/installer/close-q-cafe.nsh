!macro NSIS_HOOK_PREINSTALL
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /T /IM q-cafe-desktop.exe'
  Pop $0
  Pop $1
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter ''Name = ''''node.exe'''''' | Where-Object { $$_.ExecutablePath -eq (Join-Path $$env:LOCALAPPDATA ''Q Cafe\node.exe'') } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"'
  Pop $0
  Pop $1
  Sleep 1000
!macroend