@echo off
setlocal
cd /d "%~dp0"
title Motion Studio - Prueba de exportacion
echo ============================================
echo MOTION STUDIO - EXPORTACION PARA WINDOWS
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Falta Node.js. Instala la version LTS desde https://nodejs.org/
  goto fail
)
call node scripts\check-system.mjs
if errorlevel 1 goto fail
if not exist "node_modules\@remotion\cli\package.json" (
  echo Instalando dependencias gratuitas por primera vez...
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto fail
)
echo.
echo Renderizando 12 segundos, sin GPU dedicada y con un solo proceso...
call npm run render:demo
if errorlevel 1 goto fail
echo.
call npm run verify:demo
if errorlevel 1 goto fail
echo.
echo TERMINADO: out\motion-profesional.mp4
echo Abre el video y confirma que las 3 escenas se ven correctamente.
pause
exit /b 0
:fail
echo.
echo No se pudo completar la prueba. Copia el error de esta ventana.
pause
exit /b 1
