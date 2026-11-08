@echo off
setlocal
cd /d "%~dp0"
title Motion Studio - Regresion Remotion
where node >nul 2>nul
if errorlevel 1 goto error
call node scripts\check-system.mjs
if errorlevel 1 goto error
call node scripts\check-installed-dependencies.mjs
if errorlevel 1 (
  call npm ci --include=dev --no-audit --no-fund
  if errorlevel 1 goto error
)
call npm test
if errorlevel 1 goto error
call npm run render:motion-test
if errorlevel 1 goto error
if not exist "out\motion-studio-v4-test.mp4" goto error
echo Prueba completada: out\motion-studio-v4-test.mp4
pause
exit /b 0
:error
echo No se completo la prueba. Revisa el diagnostico anterior.
pause
exit /b 1
