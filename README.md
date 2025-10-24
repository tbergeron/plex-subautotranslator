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

# Windows paths - use backslashes!
MEDIA_BASE_PATH=D:\Plex\Media
PLEX_SERVER_URL=http://localhost:32400
PLEX_TOKEN=xxxxxxxxxxxxxxxxxxxx

# Target language for translation
TARGET_LANG=English
MAX_CHUNK_SIZE=10000
MAX_TOKENS=8000

# Server port
PORT=4000

# Logging level
LOG_LEVEL=info
```

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

# Plex Configuration (Windows paths)
MEDIA_BASE_PATH=D:\Plex\Media
PLEX_SERVER_URL=http://localhost:32400
PLEX_TOKEN=xxxxxxxxxxxxxxxxxxxx

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
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |

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
├── server.js                 # Main Express server
├── src/
│   ├── logger.js            # Logging utility
│   ├── subtitle-extractor.js # FFmpeg subtitle extraction
│   ├── translator.js        # OpenAI translation logic
│   └── plex-api.js          # Plex API integration
├── package.json             # Dependencies
├── env.template             # Environment template
├── .env                     # Your config (not in git)
├── install.bat              # Windows installer script
├── start.bat                # Windows startup script
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

