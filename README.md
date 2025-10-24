# Plex Subtitle Auto-Translator

Automatically extract and translate embedded subtitles from newly added media in Plex Media Server using OpenAI's GPT models.

## Features

- 🎬 Automatically processes new media added to Plex
- 📝 Extracts embedded subtitles from video files
- 🌍 Translates subtitles to any language using OpenAI
- 💾 Saves translated subtitles in SRT format
- 🔄 Triggers Plex library refresh after translation
- 📊 Tracks token usage and translation costs
- 🪵 Comprehensive logging

## Quick Start for Windows Users

1. **Install Node.js** from https://nodejs.org/
2. **Download/extract** this project
3. **Double-click** `install.bat` to install dependencies
4. **Edit** `.env` file with your API keys (see detailed instructions below)
5. **Run firewall command** as Administrator (see below)
6. **Configure Plex webhook** (Settings → Webhooks → Add `http://localhost:4000/webhook`)
7. **Double-click** `start.bat` to run!

👉 **See detailed Windows installation steps below** or check `WINDOWS_SETUP.md` for a comprehensive guide.

## Prerequisites

- Node.js 16+ installed
- Plex Media Server
- OpenAI API key
- FFmpeg (included via ffmpeg-static)

## Installation

### Windows Quick Install (Recommended for Windows 10 Users)

**Step 1: Install Node.js**

1. Download Node.js from https://nodejs.org/ (choose LTS version)
2. Run the installer and make sure "Add to PATH" is checked during installation
3. Restart your computer after installation

**Step 2: Download and Extract**

1. Download or clone this project to a folder (e.g., `C:\plex-subautotranslator`)
2. Extract all files

**Step 3: Run the Installer**

Double-click `install.bat` in the project folder. This will:
- Check if Node.js is installed
- Install all dependencies automatically
- Create a `.env` configuration file

**Step 4: Configure Settings**

Open the `.env` file with Notepad and fill in your settings:

```env
# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Plex configuration
PLEX_SERVER_URL=http://localhost:32400
PLEX_TOKEN=xxxxxxxxxxxxxxxxxxxx

# Optional: Restrict to specific paths (comma-separated)
# Leave blank to process all media, or add your library paths:
# For multiple libraries (Movies + TV Shows):
ALLOWED_PATHS=D:\Plex\Movies,E:\Plex\TV Shows
# For single library:
# ALLOWED_PATHS=D:\Plex\Media

# Target language for translation
TARGET_LANG=English
MAX_CHUNK_SIZE=10000
MAX_TOKENS=8000

# Server port
PORT=4000

# Logging level
LOG_LEVEL=info
```

**Note about file paths**: Plex provides the full file path automatically via webhooks, so you don't need to configure a base path. The `ALLOWED_PATHS` setting is optional and only used for security if you want to restrict which directories are processed.

**Step 5: Configure Windows Firewall**

Open Command Prompt **as Administrator** and run:

```cmd
netsh advfirewall firewall add rule name="Plex Subtitle Translator" dir=in action=allow protocol=TCP localport=4000
```

**Step 6: Configure Plex Webhook**

1. Open Plex Web App (http://localhost:32400/web)
2. Go to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter: `http://localhost:4000/webhook`
5. Click **Save Changes**

**Step 7: Start the Service**

Double-click `start.bat` to launch the service. Keep the window open!

✅ **Done!** The service is now running and will automatically translate subtitles when you add new media to Plex.

---

### Linux/Mac Installation

**1. Clone or Download the Project**

```bash
cd /path/to/your/projects
git clone <repository-url>
cd plex-subautotranslator
```

**2. Install Dependencies**

```bash
npm install
```

This will install:
- `express` - Web server for webhook endpoint
- `axios` - HTTP client for Plex API
- `ffmpeg-static` - Static FFmpeg binary
- `fluent-ffmpeg` - FFmpeg wrapper for Node.js
- `openai` - OpenAI API client
- `dotenv` - Environment variable management
- `multer` - Multipart form data parser

**3. Configure Environment Variables**

Create a `.env` file in the project root:

```bash
# Copy the template
cp env.template .env
```

Edit `.env` with your settings:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Plex Configuration
PLEX_SERVER_URL=http://localhost:32400
PLEX_TOKEN=xxxxxxxxxxxxxxxxxxxx

# Optional: Restrict to specific paths (comma-separated)
# Leave blank to process all media
ALLOWED_PATHS=

# Translation Configuration
TARGET_LANG=English
MAX_CHUNK_SIZE=10000
MAX_TOKENS=8000

# Server Configuration
PORT=4000

# Logging
LOG_LEVEL=info
```

#### Getting Your Plex Token

1. Open Plex Web App in your browser
2. Play any media item
3. Click the "..." menu → "Get Info" → "View XML"
4. Look at the URL - the `X-Plex-Token` parameter is your token
5. Copy the token value to your `.env` file

Alternatively, check this guide: https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/

**4. Configure Plex Webhooks**

1. Open Plex Web App
2. Go to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL: `http://<YOUR_IP>:4000/webhook`
   - If running on the same machine as Plex: `http://localhost:4000/webhook`
   - If running on a different machine: `http://192.168.1.xxx:4000/webhook`
5. Click **Save Changes**

## Usage

You have **two options** for automatic subtitle translation:

1. **Plex Webhook Mode** - Triggers when Plex detects new media (requires Plex webhook setup)
2. **File System Daemon Mode** - Monitors directories and triggers on any new video file (no Plex required)

### Option 1: Plex Webhook Mode

### Starting the Server on Windows

**Option 1: Using start.bat (Recommended)**

Simply double-click `start.bat` in the project folder. You should see:

```
=================================
Starting Plex Subtitle Auto-Translator
=================================
[2025-10-24T...] [INFO] Server listening on port 4000
[2025-10-24T...] [INFO] Target language: English
[2025-10-24T...] [INFO] Waiting for Plex webhooks...
=================================
```

**Keep this window open!** The service runs while this window is open. Closing it will stop the service.

**Option 2: Using Command Prompt**

1. Open Command Prompt
2. Navigate to the project folder:
   ```cmd
   cd C:\plex-subautotranslator
   ```
3. Run:
   ```cmd
   npm start
   ```

**Testing the Service**

Add a new video with embedded subtitles to your Plex library. Watch the console window for activity:

```
[INFO] Received webhook from Plex
[INFO] Processing media file: D:\Movies\MyMovie.mkv
[INFO] Step 1: Extracting subtitle from video...
[INFO] Subtitle extracted to: D:\Movies\MyMovie.extracted.srt
[INFO] Step 2: Translating subtitle to English...
[INFO] Translation complete: D:\Movies\MyMovie.en.srt
[INFO] === Subtitle processing complete ===
```

The translated subtitle will appear in the same folder as your video file!

### Running as a Windows Service (Advanced)

To run the translator as a background Windows service that starts automatically:

**Using NSSM (Recommended)**

1. Download NSSM from https://nssm.cc/download
2. Extract to `C:\nssm`
3. Open Command Prompt **as Administrator**
4. Run:
   ```cmd
   cd C:\nssm\win64
   nssm install PlexSubTranslator
   ```
5. In the NSSM GUI:
   - **Path**: `C:\Program Files\nodejs\node.exe`
   - **Startup directory**: `C:\plex-subautotranslator` (your project path)
   - **Arguments**: `server.js`
6. Click "Install service"
7. Start the service:
   ```cmd
   nssm start PlexSubTranslator
   ```

The service will now start automatically with Windows!

**Using node-windows (Alternative)**

```bash
npm install -g node-windows
```

Create a file `install-service.js`:

```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Plex Subtitle Translator',
  description: 'Automatically translates Plex subtitles',
  script: 'C:\\plex-subautotranslator\\server.js',
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

Run it:

```bash
node install-service.js
```

### Starting the Server on Linux/Mac

```bash
npm start
```

You should see:

```
=================================
Plex Subtitle Auto-Translator
=================================
[2025-10-24T...] [INFO] Server listening on port 4000
[2025-10-24T...] [INFO] Target language: English
[2025-10-24T...] [INFO] Waiting for Plex webhooks...
=================================
```

---

### Option 2: File System Daemon Mode (No Plex Required)

This mode watches directories for new video files and automatically translates them - perfect if you don't use Plex or want translation for files added outside of Plex.

**Setup:**

1. Edit your `.env` file and set `WATCH_PATHS`:

```env
# Watch these directories for new video files
WATCH_PATHS=D:\Plex\Movies,E:\Plex\TV Shows,F:\Media\Anime
```

2. **Windows:** Double-click `daemon.bat` or run:

```cmd
daemon.bat
```

3. **Linux/Mac:** Run:

```bash
node daemon.js
```

**What it does:**
- ✅ Monitors specified directories for new video files
- ✅ Waits for files to finish copying (handles large files)
- ✅ Automatically extracts and translates subtitles
- ✅ Skips files that already have translated subtitles
- ✅ Runs continuously in the background
- ✅ Watches subdirectories (e.g., Season folders inside TV Shows)

**Example output:**

```
=================================
Subtitle Translation Daemon
=================================
[INFO] Target language: English
[INFO] Watching 2 path(s):
[INFO]   - D:\Plex\Movies
[INFO]   - E:\Plex\TV Shows
[INFO] Daemon is running. Press Ctrl+C to stop.
[INFO] Watching for new video files...
=================================
[INFO] New file detected: D:\Plex\Movies\Inception (2010)\Inception (2010).mkv
[INFO] Step 1: Extracting subtitle from video...
[INFO] Step 2: Translating subtitle to English...
[INFO] Translation complete!
=================================
```

**Configuration options in `.env`:**

| Variable | Default | Description |
|----------|---------|-------------|
| `WATCH_PATHS` | - | Comma-separated directories to monitor |
| `FILE_STABLE_THRESHOLD` | `5000` | Wait time (ms) to ensure file copy is complete |
| `DEBOUNCE_DELAY` | `2000` | Delay (ms) before processing to avoid duplicate triggers |

**Running as a Windows Service:**

To run the daemon as a background service, use NSSM:

```cmd
cd C:\nssm\win64
nssm install PlexSubDaemon
```

In the NSSM GUI:
- **Path**: `C:\Program Files\nodejs\node.exe`
- **Startup directory**: `C:\plex-subautotranslator`
- **Arguments**: `daemon.js`

**Which mode should I use?**

| Feature | Webhook Mode | Daemon Mode |
|---------|--------------|-------------|
| Requires Plex | ✅ Yes | ❌ No |
| Requires webhook setup | ✅ Yes | ❌ No |
| Works with any file addition | ❌ No | ✅ Yes |
| Network port required | ✅ Yes (4000) | ❌ No |
| Resource usage | Lower | Slightly higher |

**Use Webhook Mode if:** You use Plex and only want to translate Plex-managed media  
**Use Daemon Mode if:** You want automatic translation for any video files, regardless of how they're added

## Manual Translation (Existing Media)

If you want to translate subtitles for existing media (not just new additions), use these standalone tools:

### Translate a Single File

**Windows - Drag and Drop:**

Simply drag and drop a video file onto `translate-file.bat`!

**Windows - Interactive Mode:**

Double-click `translate-file.bat` and it will prompt you to:
1. Enter the video file path (or drag & drop into the window)
2. Enter the target language (or press Enter for default)

**Windows - Command Line:**

```cmd
translate-file.bat "D:\Movies\Inception (2010)\Inception (2010).mkv"

REM Or specify a different language:
translate-file.bat "D:\Movies\Inception (2010)\Inception (2010).mkv" Spanish
```

**Using Node.js directly:**

```bash
node translate-file.js "path/to/video.mkv"
node translate-file.js "path/to/video.mkv" French
```

### Translate All Videos in a Folder

**Windows - Drag and Drop:**

Drag and drop a folder onto `translate-folder.bat`!

**Windows - Interactive Mode:**

Double-click `translate-folder.bat` and it will prompt you to:
1. Enter the folder path (or drag & drop into the window)
2. Enter the target language (or press Enter for default)

**Windows - Command Line:**

```cmd
translate-folder.bat "D:\TV Shows\Breaking Bad\Season 1"

REM Or specify language:
translate-folder.bat "D:\TV Shows\Breaking Bad\Season 1" German
```

**Using Node.js directly:**

```bash
node translate-folder.js "path/to/folder"
node translate-folder.js "path/to/folder" Japanese
```

### Manual Webhook Trigger (Advanced)

You can also manually trigger the webhook endpoint to simulate Plex adding new media:

**PowerShell:**

```powershell
$body = @{
    event = "library.new"
    Metadata = @{
        type = "movie"
        librarySectionID = "1"
        Media = @(
            @{
                Part = @(
                    @{
                        file = "D:\Plex\Movies\Inception (2010)\Inception (2010).mkv"
                    }
                )
            }
        )
    }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:4000/webhook -Method POST -Body $body -ContentType "application/json"
```

**curl:**

```bash
curl -X POST http://localhost:4000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"library.new","Metadata":{"type":"movie","librarySectionID":"1","Media":[{"Part":[{"file":"D:\\Movies\\MyMovie.mkv"}]}]}}'
```

## How It Works

1. **Webhook Trigger**: When new media is added to Plex, a webhook is sent to this service
2. **Subtitle Check**: The service checks if a translated subtitle already exists
3. **Extraction**: If not, it extracts embedded subtitles using FFmpeg
4. **Translation**: The subtitle is sent to OpenAI for translation (in chunks if necessary)
5. **Save**: The translated subtitle is saved as `[filename].[lang].srt`
6. **Refresh**: Plex library is refreshed to pick up the new subtitle

## File Naming Convention

For a video file: `Movie Title (2024).mkv`

- Extracted subtitle: `Movie Title (2024).extracted.srt` (temporary)
- Translated subtitle: `Movie Title (2024).en.srt` (final)

The `en` code is derived from the first 2 letters of `TARGET_LANG` in your `.env`.

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *required* | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use (gpt-4o-mini, gpt-4o, etc.) |
| `TARGET_LANG` | `English` | Target language for translation |
| `MAX_CHUNK_SIZE` | `10000` | Characters per translation chunk |
| `MAX_TOKENS` | `8000` | Max tokens per API request |
| `PORT` | `4000` | Server port |
| `PLEX_SERVER_URL` | `http://localhost:32400` | Plex server URL |
| `PLEX_TOKEN` | - | Plex authentication token |
| `ALLOWED_PATHS` | - | Optional: Comma-separated paths to restrict processing (see below) |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |

### Multiple Plex Libraries

If you have multiple Plex libraries with different paths (e.g., Movies and TV Shows), you have two options:

**Option 1: Process All Libraries (Recommended)**

Leave `ALLOWED_PATHS` blank or omit it entirely:

```env
ALLOWED_PATHS=
```

The service will automatically process media from all Plex libraries. Plex provides the full file path in the webhook.

**Option 2: Restrict to Specific Libraries (Security)**

Use comma-separated paths to only process specific directories:

```env
# Multiple libraries
ALLOWED_PATHS=D:\Plex\Movies,E:\Plex\TV Shows,F:\Media\Anime

# Or single library
ALLOWED_PATHS=D:\Plex\Movies
```

This is useful if you only want to translate subtitles for certain libraries and ignore others.

### Supported Languages

You can translate to any language supported by OpenAI. Examples:

- `English`
- `Spanish`
- `French`
- `German`
- `Japanese`
- `Korean`
- `Chinese`
- etc.

## Troubleshooting

### Windows-Specific Issues

#### "Node is not recognized as an internal or external command"

**Problem**: Node.js is not installed or not in PATH.

**Solution**:
1. Install Node.js from https://nodejs.org/
2. Make sure "Add to PATH" is checked during installation
3. Restart your computer
4. Open a new Command Prompt and test: `node --version`

#### "Cannot find module 'express'" or similar errors

**Problem**: Dependencies are not installed.

**Solution**:
1. Run `install.bat` again
2. Or manually: Open Command Prompt in project folder and run `npm install`

#### Webhook not triggering

**Problem**: Windows Firewall is blocking incoming connections.

**Solution**:
1. Open Command Prompt **as Administrator**
2. Run:
   ```cmd
   netsh advfirewall firewall add rule name="Plex Subtitle Translator" dir=in action=allow protocol=TCP localport=4000
   ```
3. Alternatively, add an exception in Windows Security:
   - Windows Security → Firewall & network protection → Advanced settings
   - Add Inbound Rule for TCP port 4000

#### Paths with spaces causing issues

**Problem**: Windows paths with spaces (like `C:\Program Files\...`) may cause issues.

**Solution**:
- In `.env`, use backslashes: `D:\Plex\Media`
- Avoid paths with spaces if possible
- If you must use spaces, the code handles them automatically

#### Service stops when closing Command Prompt

**Problem**: The service runs in the foreground and stops when you close the window.

**Solution**:
- Use the Windows Service installation (see "Running as a Windows Service" section)
- Or use NSSM to run as a background service

### General Issues

#### "No subtitle streams found in video"

**Problem**: The video file doesn't have embedded subtitles.

**Solution**:
- Find external subtitle files online
- Use a different source with embedded subtitles
- Check if the video actually has subtitles: Right-click video in Plex → Media Info

#### "Could not connect to Plex server"

**Problem**: Cannot reach Plex server.

**Solution**:
- Verify `PLEX_SERVER_URL` in `.env` (should be `http://localhost:32400`)
- Check if Plex is running
- Test the URL in your browser: `http://localhost:32400/web`
- If Plex is on a different computer, use its IP address: `http://192.168.1.xxx:32400`

#### "Error extracting subtitle"

**Problem**: Subtitle format cannot be converted to SRT.

**Solution**:
- Some subtitle formats (e.g., PGS/bitmap) can't be directly converted to text-based SRT
- Try using a video with SRT or ASS/SSA subtitle tracks
- Check the subtitle codec in Plex Media Info

#### "Invalid API key" or OpenAI errors

**Problem**: OpenAI API key is incorrect or has issues.

**Solution**:
- Verify your `OPENAI_API_KEY` in `.env`
- Make sure you copied the entire key (starts with `sk-`)
- Check if your key is active at https://platform.openai.com/api-keys
- Verify you have available credits/billing set up

#### Webhook receiving but not processing

**Problem**: Webhook is received but subtitle extraction fails.

**Solution**:
1. Set `LOG_LEVEL=debug` in `.env` to see detailed logs
2. Check the file path being processed
3. Verify the video file exists and is accessible
4. Check if subtitle already exists (service skips if present)

#### High OpenAI costs

**Problem**: Translation costs are adding up.

**Solution**:
- Use `gpt-4o-mini` instead of larger models (significantly cheaper)
- Reduce `MAX_TOKENS` if subtitles are short
- Current pricing (GPT-4o-mini):
  - Input: $0.15 per 1M tokens
  - Output: $0.60 per 1M tokens
  - Average movie: ~$0.01-0.05
- Monitor usage at: https://platform.openai.com/usage

#### Testing the webhook manually (Windows)

To test if the webhook endpoint is working:

**Using PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:4000/webhook -Method POST -Body '{"event":"library.new"}' -ContentType "application/json"
```

**Using curl (if installed):**
```cmd
curl -X POST http://localhost:4000/webhook -H "Content-Type: application/json" -d "{\"event\":\"library.new\"}"
```

Check the console window for the incoming request log.

## Project Structure

```
plex-subautotranslator/
├── server.js                 # Plex webhook server (Option 1)
├── daemon.js                 # File system watcher daemon (Option 2)
├── daemon.bat                # Windows wrapper for daemon
├── translate-file.js         # Standalone: translate single file
├── translate-file.bat        # Windows wrapper (drag & drop support)
├── translate-folder.js       # Standalone: batch translate folder
├── translate-folder.bat      # Windows wrapper (drag & drop support)
├── src/
│   ├── logger.js            # Logging utility (console + file)
│   ├── subtitle-extractor.js # FFmpeg subtitle extraction
│   ├── translator.js        # OpenAI translation logic
│   └── plex-api.js          # Plex API integration
├── logs/
│   └── app.log              # Application log file (auto-created)
├── package.json             # Dependencies
├── env.template             # Environment template
├── .env                     # Your config (not in git)
├── install.bat              # Windows installer script
├── start.bat                # Start webhook server
├── README.md                # This file (you are here!)
├── WINDOWS_SETUP.md         # Detailed Windows setup guide
└── QUICK_START.md           # 5-minute quick start guide
```

## Development

### Debug Mode

Set `LOG_LEVEL=debug` in `.env` for detailed logging:

```env
LOG_LEVEL=debug
```

### Log Files

All logs are written to both the console and a file:

- **Log file location**: `logs/app.log`
- **Windows path**: `C:\plex-subautotranslator\logs\app.log`

The log file contains the same information as the console output, including:
- Timestamps for all events
- Webhook activity
- Subtitle extraction progress
- Translation status
- Errors and warnings
- Token usage statistics

**Tip**: You can monitor the log file in real-time on Windows using PowerShell:

```powershell
Get-Content logs\app.log -Wait -Tail 50
```

Or open it with any text editor to review past activity.

### Testing

Test the webhook endpoint manually:

```bash
# Create a test payload
echo '{"event":"library.new","Metadata":{"type":"movie","librarySectionID":"1","Media":[{"Part":[{"file":"D:\\Movies\\Test.mkv"}]}]}}' > test-payload.json

# Send it
curl -X POST http://localhost:4000/webhook \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

## License

MIT

## Credits

Built with:
- [OpenAI API](https://openai.com/)
- [FFmpeg](https://ffmpeg.org/)
- [Express](https://expressjs.com/)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)

## Support

For issues and questions:
1. Check the logs in your console
2. Verify all configuration in `.env`
3. Test individual components (FFmpeg, OpenAI API, Plex connection)
4. Review Plex webhook documentation: https://support.plex.tv/articles/115002267687-webhooks/

---

**Note**: This tool is designed for personal use to make your media more accessible. Please respect copyright laws and only use with media you have the right to modify.

