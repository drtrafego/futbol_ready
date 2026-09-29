@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js 24 LTS para Windows.
  echo Para experimentar sem instalar nada, abra JOGAR.html no Chrome ou Edge.
  pause
  exit /b 1
)
node tools\server.mjs --open
pause
