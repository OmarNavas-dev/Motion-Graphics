@echo off
setlocal
cd /d "%~dp0"
title Motion Studio 7 - Inicio
if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if exist "%~dp0tools\ffmpeg\bin" set "PATH=%~dp0tools\ffmpeg\bin;%PATH%"
if exist "C:\ffmpeg\bin" set "PATH=C:\ffmpeg\bin;%PATH%"
echo =========================================
echo MOTION STUDIO 7 - HYPERFRAMES + REMOTION
echo =========================================
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js 22.13 LTS o 24 y superiores de 64 bits: https://nodejs.org/
  goto fail
)
call node scripts\check-system.mjs
if errorlevel 1 goto fail
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js esta instalado, pero falta npm. Reinstala Node.js LTS completo.
  goto fail
)
set "NECESITA_INSTALAR="
call node scripts\check-installed-dependencies.mjs
if errorlevel 1 set "NECESITA_INSTALAR=1"
if not exist "node_modules\.bin\vite.cmd" set "NECESITA_INSTALAR=1"
if not exist "node_modules\vite\package.json" set "NECESITA_INSTALAR=1"
if not exist "node_modules\@remotion\player\package.json" set "NECESITA_INSTALAR=1"
if not exist "node_modules\@remotion\cli\remotion-cli.js" set "NECESITA_INSTALAR=1"
if defined NECESITA_INSTALAR (
  echo Faltan dependencias del editor. Instalando Vite, React y Remotion...
  echo Esto puede tardar unos minutos la primera vez.
  call npm ci --include=dev --no-audit --no-fund
  if errorlevel 1 goto fail
)
if not exist "node_modules\.bin\vite.cmd" (
  echo ERROR: Vite sigue sin estar instalado. Revisa la conexion a Internet y vuelve a intentar.
  goto fail
)
echo Construyendo interfaz de Motion Studio 7...
call npm run studio:build
if errorlevel 1 goto fail
set "MS_PORT=4317"
if defined MOTION_STUDIO_PORT set "MS_PORT=%MOTION_STUDIO_PORT%"
netstat -ano | findstr /R /C:":%MS_PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo.
  echo ATENCION: ya hay un servidor usando el puerto %MS_PORT%.
  echo Probablemente es una version anterior de Motion Studio que sigue abierta.
  echo Cierra la ventana "Motion Studio - Servidor" anterior y vuelve a ejecutar este archivo.
  goto fail
)
echo Iniciando servidor en 127.0.0.1:%MS_PORT%...
start "Motion Studio - Servidor" cmd /k "node server.mjs"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:4317"
echo.
echo Editor abierto. Deja abierta la ventana del servidor mientras trabajas.
echo Cierra la ventana del servidor cuando termines.
pause
exit /b 0
:fail
echo.
echo El editor no se pudo iniciar. Haz una captura de este error.
pause
exit /b 1
