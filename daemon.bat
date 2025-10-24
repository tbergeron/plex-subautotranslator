@echo off
setlocal

REM Windows batch file to start the file system daemon

echo =======================================
echo Subtitle Translation Daemon
echo =======================================
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create a .env file with your configuration.
    echo You can copy env.template to .env and edit it.
    echo.
    echo Make sure to set WATCH_PATHS to the directories you want to monitor.
    echo Example: WATCH_PATHS=D:\Plex\Movies,E:\Plex\TV Shows
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo ERROR: Dependencies not installed!
    echo.
    echo Please run install.bat first to install dependencies.
    echo.
    pause
    exit /b 1
)

echo Starting file system daemon...
echo This will monitor directories for new video files
echo and automatically translate subtitles.
echo.
echo Press Ctrl+C to stop the daemon.
echo.
echo =======================================
echo.

REM Run the daemon
node "%~dp0daemon.js"

echo.
echo =======================================
echo Daemon stopped.
echo =======================================
pause

