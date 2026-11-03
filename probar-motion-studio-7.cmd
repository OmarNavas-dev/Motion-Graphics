@echo off
setlocal
cd /d "%~dp0"
title Motion Studio 7 - Prueba HyperFrames
if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if exist "%~dp0tools\ffmpeg\bin" set "PATH=%~dp0tools\ffmpeg\bin;%PATH%"
if exist "C:\ffmpeg\bin" set "PATH=C:\ffmpeg\bin;%PATH%"
 echo ============================================
echo MOTION STUDIO 7 - PRUEBA HYPERFRAMES
 echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js 22 o superior: https://nodejs.org/
  goto error
)
where npm >nul 2>nul
if errorlevel 1 goto error
call node scripts\check-system.mjs
if errorlevel 1 goto error
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo Falta FFmpeg. Ejecuta primero instalar-ffmpeg.cmd dentro de esta carpeta.
  goto error
)
where ffprobe >nul 2>nul
if errorlevel 1 (
  echo Falta FFprobe. Ejecuta instalar-ffmpeg.cmd dentro de esta carpeta.
  goto error
)
set "NECESITA_INSTALAR="
if not exist "node_modules\.bin\vite.cmd" set "NECESITA_INSTALAR=1"
if not exist "node_modules\@remotion\cli\remotion-cli.js" set "NECESITA_INSTALAR=1"
if defined NECESITA_INSTALAR (
  echo Instalando dependencias de Motion Studio...
  call npm ci --include=dev --no-audit --no-fund
  if errorlevel 1 goto error
)
echo Ejecutando pruebas automatizadas...
call npm test
if errorlevel 1 goto error
echo Preparando composición temporal neutral, sin datos ni medios del usuario...
node scripts\create-hyperframes-smoke.mjs
if errorlevel 1 goto error
if not exist "out" mkdir out
pushd .hyperframes\smoke-workspace
echo Validando la composicion HTML con HyperFrames lint...
call npm exec --yes --package=hyperframes@0.8.225 -- hyperframes lint
if errorlevel 1 goto hyperframes_error
echo Preparando Chrome de HyperFrames. La primera vez puede descargarlo.
call npm exec --yes --package=hyperframes@0.8.225 -- hyperframes browser ensure
if errorlevel 1 goto hyperframes_error
echo Comprobando los requisitos de HyperFrames...
call npm exec --yes --package=hyperframes@0.8.225 -- hyperframes doctor
if errorlevel 1 goto hyperframes_error
echo Renderizando muestra a 24 FPS, calidad borrador y un trabajador...
call npm exec --yes --package=hyperframes@0.8.225 -- hyperframes render --output ..\..\out\motion-studio-v7-smoke.mp4 --fps 24 --quality draft --workers 1
if errorlevel 1 goto hyperframes_error
popd
if not exist "out\motion-studio-v7-smoke.mp4" goto error
 echo.
echo Prueba completada: out\motion-studio-v7-smoke.mp4
start "" "out\motion-studio-v7-smoke.mp4"
pause
exit /b 0
:hyperframes_error
popd
echo.
echo HyperFrames no pudo completar la prueba. Comprueba FFmpeg y la conexion de Internet inicial.
echo Remotion sigue disponible dentro del editor como alternativa.
pause
exit /b 1
:error
echo.
echo La prueba no se completo. Envia una captura del error.
pause
exit /b 1
