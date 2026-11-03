@echo off
setlocal
cd /d "%~dp0"
title Motion Studio 6 - Prueba CPU
echo ===========================================
echo PRUEBA DE COMPATIBILIDAD LEGADA - VERSION 5
echo ===========================================
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js LTS x64: https://nodejs.org/
  goto error
)
call node scripts\check-system.mjs
if errorlevel 1 goto error
set "NECESITA_INSTALAR="
if not exist "node_modules\.bin\vite.cmd" set "NECESITA_INSTALAR=1"
if not exist "node_modules\@remotion\cli\remotion-cli.js" set "NECESITA_INSTALAR=1"
if defined NECESITA_INSTALAR (
  echo Completando instalacion de dependencias gratuitas...
  call npm ci --include=dev --no-audit --no-fund
  if errorlevel 1 goto error
)
echo Ejecutando pruebas de compatibilidad...
call npm test
if errorlevel 1 goto error
echo.
echo Ejecutando la ruta de render de regresion vigente...
call npm run render:motion-test
if errorlevel 1 goto error
echo.
call node scripts\verify-render.mjs out\motion-studio-v4-test.mp4
if errorlevel 1 goto error
echo.
echo Revisa out\motion-studio-v4-test.mp4
pause
exit /b 0
:error
echo.
echo La prueba no se completo. Enviame una captura del error.
pause
exit /b 1
