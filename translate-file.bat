@echo off
setlocal disabledelayedexpansion

REM Windows batch wrapper for translate-file.js
REM Makes it easier to drag-and-drop files

echo =======================================
echo Manual Subtitle Translator
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

REM Get the video file path
if "%~1"=="" (
    REM No parameter passed, prompt user for input
    echo Drag and drop a video file here, or type/paste the full path
    echo Example: D:\Movies\Inception\Inception.mkv
    echo.
    set /p VIDEO_FILE=Video file path: 
    
    REM Check if user entered anything
    if not defined VIDEO_FILE (
        echo.
        echo ERROR: No file path provided!
        pause
        exit /b 1
    )
    
    REM Debug output
    echo.
    echo [DEBUG] Raw input: %VIDEO_FILE%
    echo.
    
    REM Pass to Node.js with quotes - Node will handle quote stripping
    node "%~dp0translate-file.js" "%VIDEO_FILE%"
) else (
    REM Parameter passed - use it directly
    node "%~dp0translate-file.js" %1
)

echo.
echo =======================================
pause
