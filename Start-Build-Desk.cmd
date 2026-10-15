@echo off
cd /d "%~dp0"
node tools/start-app.mjs --open
if errorlevel 1 pause
