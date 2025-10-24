@echo off
setlocal enabledelayedexpansion

REM Windows batch wrapper for translate-folder.js
REM Makes it easier to drag-and-drop folders

echo =======================================
echo Batch Subtitle Translator
echo =======================================
echo.

REM Check if a folder was provided
if "%~1"=="" (
    echo No folder specified!
    echo.
    echo Usage: Drag and drop a folder onto this batch file
    echo   OR: translate-folder.bat "path\to\folder" [language]
    echo.
    echo Examples:
    echo   translate-folder.bat "D:\Movies\Season 1"
    echo   translate-folder.bat "D:\TV Shows\Show Name\Season 1" Spanish
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

REM Get the folder path
set "FOLDER_PATH=%~1"

REM Get optional language parameter
set "LANGUAGE=%~2"

echo Folder: %FOLDER_PATH%
if not "%LANGUAGE%"=="" (
    echo Target language: %LANGUAGE%
)
echo.

REM Run the batch translation script
if "%LANGUAGE%"=="" (
    node "%~dp0translate-folder.js" "%FOLDER_PATH%"
) else (
    node "%~dp0translate-folder.js" "%FOLDER_PATH%" "%LANGUAGE%"
)

echo.
echo =======================================
pause

