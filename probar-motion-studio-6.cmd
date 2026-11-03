@echo off
setlocal
cd /d "%~dp0"
title Motion Studio 6 - Prueba de tus imagenes en CPU
echo ============================================
echo PRUEBA DE COMPATIBILIDAD LEGADA - VERSION 6
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js LTS x64: https://nodejs.org/
  goto error
)
where npm >nul 2>nul
if errorlevel 1 goto error
call node scripts\check-system.mjs
if errorlevel 1 goto error
set "NECESITA_INSTALAR="
if not exist "node_modules\.bin\vite.cmd" set "NECESITA_INSTALAR=1"
if not exist "node_modules\@remotion\cli\remotion-cli.js" set "NECESITA_INSTALAR=1"
if defined NECESITA_INSTALAR (
  echo Instalando dependencias gratuitas... Esto puede tardar unos minutos.
  call npm ci --include=dev --no-audit --no-fund
  if errorlevel 1 goto error
)
echo Ejecutando pruebas del motor...
call npm test
if errorlevel 1 goto error
echo.
echo Ejecutando la prueba actual sin importar medios de demostracion.
call npm run render:motion-test
if errorlevel 1 goto error
call node scripts\verify-render.mjs out\motion-studio-v4-test.mp4
if errorlevel 1 goto error
echo.
echo La regresion se guardo en out\motion-studio-v4-test.mp4
if exist "out\motion-studio-v4-test.mp4" start "" "out\motion-studio-v4-test.mp4"
pause
exit /b 0
:error
echo.
echo La prueba no se completo. Por favor, enviame una captura de este error.
pause
exit /b 1
