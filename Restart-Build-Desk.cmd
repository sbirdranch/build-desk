@echo off
cd /d "%~dp0"
node tools/start-app.mjs --restart --open
if errorlevel 1 pause
