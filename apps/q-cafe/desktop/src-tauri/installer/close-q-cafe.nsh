!macro NSIS_HOOK_PREINSTALL
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /T /IM q-cafe-desktop.exe'
  Pop $0
  Pop $1
  Sleep 1000
!macroend
