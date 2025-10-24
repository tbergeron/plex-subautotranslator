@echo off
echo =======================================
echo Plex Subtitle Auto-Translator Setup
echo =======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

echo Installing dependencies...
echo This may take a few minutes...
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo =======================================
echo Installation complete!
echo =======================================
echo.
echo Dependencies installed:
echo  - express (webhook server)
echo  - ffmpeg-static (subtitle extraction)
echo  - openai (translation)
echo  - chokidar (file system watcher)
echo  - and more...
echo.
echo Next steps:
echo 1. Copy env.template to .env
echo 2. Edit .env with your settings
echo 3. Run: npm start
echo.
echo For detailed instructions, see README.md
echo.

if not exist .env (
    echo Creating .env from template...
    copy env.template .env
    echo.
    echo IMPORTANT: Edit .env file with your API keys and settings!
    echo.
)

pause

