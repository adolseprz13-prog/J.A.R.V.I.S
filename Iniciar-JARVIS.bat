@echo off
cd /d "%~dp0"
if not exist "dist\index.html" (
  call npm.cmd run build
)
start "" "node_modules\electron\dist\electron.exe" .
