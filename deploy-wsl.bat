@echo off
setlocal

title Vertex WSL Docker Deploy

rem %~dp0 always ends with backslash, strip the trailing one
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo ========================================
echo  Vertex deploy to WSL Docker
echo ========================================
echo  Windows path: %ROOT%
echo ========================================
echo.

where wsl >nul 2>&1
if errorlevel 1 (
  echo [ERROR] wsl command not found. Please install WSL first.
  pause
  exit /b 1
)

wsl -e bash -lc "cd \"$(wslpath -u '%ROOT%')\" && bash docker/deploy-wsl.sh %*"
if errorlevel 1 (
  echo.
  echo [ERROR] Deploy failed.
  pause
  exit /b 1
)

echo.
echo [OK] Deploy finished.
pause
exit /b 0
