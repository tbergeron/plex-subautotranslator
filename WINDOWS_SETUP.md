# Windows Setup Guide

This guide will walk you through setting up the Plex Subtitle Auto-Translator on Windows 10.

## Step 1: Install Node.js

1. Download Node.js from https://nodejs.org/
2. Choose the LTS (Long Term Support) version
3. Run the installer
4. Accept the license agreement
5. Keep the default installation location
6. **Important**: Make sure "Add to PATH" is checked
7. Click Install

To verify installation, open Command Prompt and run:

```cmd
node --version
npm --version
```

You should see version numbers for both commands.

## Step 2: Download and Extract the Project

1. Download or clone this project to a folder, e.g., `C:\plex-subautotranslator`
2. Open Command Prompt
3. Navigate to the project folder:
   ```cmd
   cd C:\plex-subautotranslator
   ```

## Step 3: Install Dependencies

Double-click `install.bat` or run in Command Prompt:

```cmd
install.bat
```

This will:
- Check if Node.js is installed
- Install all required packages
- Create a `.env` file from the template

Wait for the installation to complete (may take a few minutes).

## Step 4: Configure Your Settings

1. Open the `.env` file with Notepad or your preferred text editor
2. Fill in your settings:

### OpenAI API Key

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

Get your API key from: https://platform.openai.com/api-keys

### Plex Configuration

```env
PLEX_SERVER_URL=http://localhost:32400
PLEX_TOKEN=xxxxxxxxxxxxxxxxxxxx
```

#### Finding Your Plex Token:

1. Open Plex in your web browser
2. Play any video
3. Click the "..." button → "Get Info" → "View XML"
4. Look at the URL - find `X-Plex-Token=...`
5. Copy the token (everything after the equals sign)

#### Multiple Library Paths (Optional):

If you have multiple Plex libraries (e.g., Movies and TV Shows in different locations), you can:

**Option 1**: Leave `ALLOWED_PATHS` blank to process all libraries automatically (recommended)

```env
ALLOWED_PATHS=
```

**Option 2**: Specify paths to restrict processing to certain libraries:

```env
# Multiple libraries - comma-separated, use backslashes for Windows
ALLOWED_PATHS=D:\Plex\Movies,E:\Plex\TV Shows,F:\Media\Anime
```

**Important**: Plex sends the full file path automatically, so this setting is optional and only needed if you want to restrict which folders are processed for security.

### Target Language

```env
TARGET_LANG=English
```

You can change this to any language:
- Spanish
- French
- German
- Japanese
- Korean
- etc.

### Complete .env Example:

```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789
OPENAI_MODEL=gpt-4o-mini
PLEX_SERVER_URL=http://localhost:32400
PLEX_TOKEN=abcdef1234567890
ALLOWED_PATHS=D:\Plex\Movies,E:\Plex\TV Shows
TARGET_LANG=English
MAX_CHUNK_SIZE=10000
MAX_TOKENS=8000
PORT=4000
LOG_LEVEL=info
```

Save the file and close it.

## Step 5: Configure Windows Firewall

The service needs to receive webhooks from Plex, so we need to allow incoming connections.

### Option A: Using Command Prompt (Recommended)

1. Right-click Command Prompt → "Run as Administrator"
2. Run this command:

```cmd
netsh advfirewall firewall add rule name="Plex Subtitle Translator" dir=in action=allow protocol=TCP localport=4000
```

### Option B: Using Windows Firewall GUI

1. Open Windows Security → Firewall & network protection
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter "4000" → Next
6. Select "Allow the connection" → Next
7. Check all profiles → Next
8. Name it "Plex Subtitle Translator" → Finish

## Step 6: Configure Plex Webhook

1. Open Plex Web App in your browser (http://localhost:32400/web)
2. Click the Settings icon (wrench) in the top right
3. Go to "Settings" → "Webhooks"
4. Click "Add Webhook"
5. Enter the URL:
   ```
   http://localhost:4000/webhook
   ```
   (If Plex is on a different computer, use your server's IP address)
6. Click "Save Changes"

## Step 7: Start the Service

Double-click `start.bat` or run in Command Prompt:

```cmd
start.bat
```

You should see:

```
=======================================
Plex Subtitle Auto-Translator
=======================================
[INFO] Server listening on port 4000
[INFO] Target language: English
[INFO] Waiting for Plex webhooks...
=======================================
```

**The service is now running!**

Keep this window open. The service will automatically process new media added to Plex.

## Step 8: Test It

1. Add a new video file with embedded subtitles to your Plex library
2. Watch the console for activity
3. Check the video folder - you should see a new `.en.srt` file
4. Refresh Plex and verify the translated subtitle appears

## Running as a Background Service (Advanced)

If you want the translator to run in the background (even after you close Command Prompt):

### Using NSSM (Non-Sucking Service Manager)

1. Download NSSM from https://nssm.cc/download
2. Extract to `C:\nssm`
3. Open Command Prompt as Administrator
4. Navigate to NSSM folder:
   ```cmd
   cd C:\nssm\win64
   ```
5. Install the service:
   ```cmd
   nssm install PlexSubTranslator
   ```
6. In the GUI that opens:
   - Path: `C:\Program Files\nodejs\node.exe`
   - Startup directory: `C:\plex-subautotranslator`
   - Arguments: `server.js`
   - Service name: `PlexSubTranslator`
7. Click "Install service"
8. Start the service:
   ```cmd
   nssm start PlexSubTranslator
   ```

The service will now start automatically when Windows boots.

To manage the service:
```cmd
nssm stop PlexSubTranslator
nssm start PlexSubTranslator
nssm restart PlexSubTranslator
nssm remove PlexSubTranslator
```

## Troubleshooting

### "Node is not recognized as an internal or external command"

- Node.js is not installed or not in PATH
- Reinstall Node.js and make sure "Add to PATH" is checked
- Restart your computer

### "Cannot find module 'express'"

- Dependencies not installed
- Run `install.bat` again

### "ECONNREFUSED" error

- Plex is not running
- Wrong `PLEX_SERVER_URL` in `.env`
- Check if Plex is accessible at http://localhost:32400/web

### "Invalid API key"

- Check your `OPENAI_API_KEY` in `.env`
- Make sure you copied the entire key
- Verify the key is active on OpenAI's website

### Webhook not triggering

- Check Windows Firewall settings
- Verify webhook URL in Plex: `http://localhost:4000/webhook`
- Test manually:
  ```cmd
  curl -X POST http://localhost:4000/webhook -d "payload={}"
  ```

### "No subtitle streams found"

- The video doesn't have embedded subtitles
- Try a different video file
- Or download external subtitle files

## Logs and Debugging

To see more detailed logs:

1. Edit `.env`
2. Change `LOG_LEVEL=info` to `LOG_LEVEL=debug`
3. Restart the service

You'll see detailed information about:
- Webhook payloads
- FFmpeg commands
- OpenAI API calls
- File operations

## Cost Estimation

With `gpt-4o-mini`:
- Average movie subtitle: $0.01 - $0.05
- TV episode subtitle: $0.005 - $0.02

Costs are very low, but check your OpenAI usage at: https://platform.openai.com/usage

## Translating Existing Media

The automatic webhook only processes NEW media added to Plex. To translate existing media:

### Single File

1. Open the project folder
2. Find `translate-file.bat`
3. Drag and drop your video file onto it
4. Wait for translation to complete!

Or use Command Prompt:

```cmd
cd C:\plex-subautotranslator
translate-file.bat "D:\Movies\MyMovie.mkv"
translate-file.bat "D:\Movies\MyMovie.mkv" Spanish
```

### Entire Folder (TV Show Season)

1. Open the project folder
2. Find `translate-folder.bat`
3. Drag and drop a folder onto it (e.g., "Season 1" folder)
4. Wait for all videos to be processed!

Or use Command Prompt:

```cmd
cd C:\plex-subautotranslator
translate-folder.bat "D:\TV Shows\Breaking Bad\Season 1"
translate-folder.bat "D:\TV Shows\Breaking Bad\Season 1" Japanese
```

The batch scripts will:
- Skip files that already have translated subtitles
- Show progress for each file
- Display a summary at the end

## Support

If you're still having issues:

1. Check the console for error messages
2. Verify all settings in `.env`
3. Make sure Plex, Node.js, and the service are all running
4. Review the main README.md for more details

---

**Tip**: Keep the Command Prompt window open to see real-time activity when new media is added!

