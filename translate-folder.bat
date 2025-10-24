@echo off
setlocal disabledelayedexpansion

REM Windows batch wrapper for translate-folder.js
REM Makes it easier to drag-and-drop folders

echo =======================================
echo Batch Subtitle Translator
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

REM Get the folder path
if "%~1"=="" (
    REM No parameter passed, prompt user for input
    echo Drag and drop a folder here, or type/paste the full path
    echo Example: D:\TV Shows\Breaking Bad\Season 1
    echo.
    set /p "FOLDER_PATH=Folder path: "
    
    REM Check if user entered anything
    if not defined FOLDER_PATH (
        echo.
        echo ERROR: No folder path provided!
        pause
        exit /b 1
    )
    
    REM Strip quotes using string substitution (safer method)
    set "FOLDER_PATH=%FOLDER_PATH:"=%"
    
    REM Debug output
    echo.
    echo [DEBUG] Received path: "%FOLDER_PATH%"
    echo.
    
    REM Pass to Node.js
    node "%~dp0translate-folder.js" "%FOLDER_PATH%"
) else (
    REM Parameter passed - use it directly
    node "%~dp0translate-folder.js" %1
)

echo.
echo =======================================
pause
