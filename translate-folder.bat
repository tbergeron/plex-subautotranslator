@echo off
setlocal

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
    set /p FOLDER_PATH=Folder path 
    
    REM Remove surrounding quotes if user added them
    call :RemoveQuotes FOLDER_PATH
    
    REM Check if user entered anything
    if "!FOLDER_PATH!"=="" (
        echo.
        echo ERROR: No folder path provided!
        pause
        exit /b 1
    )
) else (
    set "FOLDER_PATH=%~1"
)

echo.
echo =======================================
echo Folder: %FOLDER_PATH%
echo Target language: From .env file (TARGET_LANG)
echo =======================================
echo.

REM Run the batch translation script
node "%~dp0translate-folder.js" "%FOLDER_PATH%"

goto :End

:RemoveQuotes
REM Subroutine to remove quotes from a variable
setlocal enabledelayedexpansion
set "temp=!%~1!"
set "temp=!temp:"=!"
endlocal & set "%~1=%temp%"
goto :eof

:End

echo.
echo =======================================
pause

