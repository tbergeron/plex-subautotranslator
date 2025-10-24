@echo off
setlocal enabledelayedexpansion

REM Windows batch wrapper for translate-file.js
REM Makes it easier to drag-and-drop files

echo =======================================
echo Manual Subtitle Translator
echo =======================================
echo.

REM Check if a file was provided
if "%~1"=="" (
    echo No file specified!
    echo.
    echo Usage: Drag and drop a video file onto this batch file
    echo   OR: translate-file.bat "path\to\video.mkv" [language]
    echo.
    echo Examples:
    echo   translate-file.bat "D:\Movies\MyMovie.mkv"
    echo   translate-file.bat "D:\Movies\MyMovie.mkv" Spanish
    echo.
    pause
    exit /b 1
)

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the video file path
set "VIDEO_FILE=%~1"

REM Get optional language parameter
set "LANGUAGE=%~2"

echo Video file: %VIDEO_FILE%
if not "%LANGUAGE%"=="" (
    echo Target language: %LANGUAGE%
)
echo.

REM Run the translation script
if "%LANGUAGE%"=="" (
    node "%~dp0translate-file.js" "%VIDEO_FILE%"
) else (
    node "%~dp0translate-file.js" "%VIDEO_FILE%" "%LANGUAGE%"
)

echo.
echo =======================================
pause

