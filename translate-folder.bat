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

REM Get optional language parameter
if "%~2"=="" (
    echo.
    echo Enter target language or press Enter for default English
    echo Examples: Spanish, French, German, Japanese, Korean
    echo.
    set /p LANGUAGE=Target language 
    
    REM If user pressed Enter without typing, leave empty (will use default)
    if "!LANGUAGE!"=="" (
        echo Using default language from .env file
    )
) else (
    set "LANGUAGE=%~2"
)

echo.
echo =======================================
echo Folder: %FOLDER_PATH%
if not "%LANGUAGE%"=="" (
    echo Target language: %LANGUAGE%
)
echo =======================================
echo.

REM Run the batch translation script
if "%LANGUAGE%"=="" (
    node "%~dp0translate-folder.js" "%FOLDER_PATH%"
) else (
    node "%~dp0translate-folder.js" "%FOLDER_PATH%" "%LANGUAGE%"
)

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

