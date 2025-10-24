@echo off
echo =======================================
echo Starting Plex Subtitle Auto-Translator
echo =======================================
echo.

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create a .env file with your configuration.
    echo You can copy env.template to .env and edit it.
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

echo Starting server...
echo Press Ctrl+C to stop
echo.

node server.js

pause

