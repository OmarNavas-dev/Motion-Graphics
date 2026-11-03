@echo off
setlocal
cd /d "%~dp0"
title Motion Studio 7 - Instalar FFmpeg
echo =========================================
echo MOTION STUDIO 7 - INSTALAR FFMPEG
echo =========================================

call :add_known_paths
where ffmpeg >nul 2>nul
if errorlevel 1 goto install_ffmpeg
where ffprobe >nul 2>nul
if errorlevel 1 goto install_ffmpeg
goto verify_tools

:install_ffmpeg
where winget >nul 2>nul
if errorlevel 1 goto manual

echo FFmpeg o FFprobe no esta instalado o Windows no lo encuentra.
echo Se instalara el paquete gratuito de Gyan mediante WinGet.
echo Se necesita conexion a Internet.
echo.
winget install --id Gyan.FFmpeg --exact --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto install_error
call :add_known_paths

echo.
echo Verificando FFmpeg y FFprobe...

:verify_tools
where ffmpeg >nul 2>nul
if errorlevel 1 goto restart_shell
where ffprobe >nul 2>nul
if errorlevel 1 goto restart_shell

echo.
echo FFMPEG Y FFPROBE ESTAN DISPONIBLES.
ffmpeg -version | findstr /b /c:"ffmpeg version"
echo.
echo Ahora ejecuta probar-motion-studio-7.cmd.
echo Si Motion Studio estaba abierto, cierralo y vuelve a iniciarlo.
pause
exit /b 0

:add_known_paths
if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
if exist "%~dp0tools\ffmpeg\bin" set "PATH=%~dp0tools\ffmpeg\bin;%PATH%"
if exist "C:\ffmpeg\bin" set "PATH=C:\ffmpeg\bin;%PATH%"
exit /b 0

:manual
echo No se encontro WinGet en este equipo.
echo.
echo Alternativa manual:
echo 1. Abre https://www.gyan.dev/ffmpeg/builds/
echo 2. Descarga el archivo release essentials.
echo 3. Extrae la carpeta y localiza la subcarpeta bin.
echo 4. Copia esa carpeta como C:\ffmpeg\bin
echo 5. Vuelve a ejecutar este archivo.
echo.
pause
exit /b 1

:install_error
echo.
echo WinGet no pudo instalar FFmpeg. Comprueba Internet o usa la instalacion manual indicada arriba.
pause
exit /b 1

:restart_shell
echo.
echo FFmpeg se instalo, pero Windows todavia no actualizo la ruta de esta ventana.
echo Cierra esta ventana, abre instalar-ffmpeg.cmd una vez mas y luego ejecuta la prueba.
pause
exit /b 0
