@echo off
cd /d "%~dp0"
node tools/control-app.mjs status
pause
