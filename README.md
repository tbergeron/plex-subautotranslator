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

## Prerequisites

- Node.js 16+ installed
- Plex Media Server
- OpenAI API key
- FFmpeg (included via ffmpeg-static)

## Installation

### 1. Clone or Download the Project

```bash
cd /path/to/your/projects
git clone <repository-url>
cd plex-subautotranslator
```

### 2. Install Dependencies

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

### 3. Configure Environment Variables

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

### 4. Configure Plex Webhooks

1. Open Plex Web App
2. Go to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL: `http://<YOUR_IP>:4000/webhook`
   - If running on the same machine as Plex: `http://localhost:4000/webhook`
   - If running on a different machine: `http://192.168.1.xxx:4000/webhook`
5. Click **Save Changes**

**Important for Windows:** Make sure Windows Firewall allows incoming connections on port 4000:

```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Plex Subtitle Translator" dir=in action=allow protocol=TCP localport=4000
```

## Usage

### Starting the Server

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

### Running as a Windows Service (Optional)

To run the server as a background service on Windows, you can use `node-windows`:

```bash
npm install -g node-windows
```

Create a service script `install-service.js`:

```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Plex Subtitle Translator',
  description: 'Automatically translates Plex subtitles',
  script: 'C:\\path\\to\\plex-subautotranslator\\server.js',
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

### "No subtitle streams found in video"

The video file doesn't have embedded subtitles. You can:
- Find external subtitle files online
- Use a different source with embedded subtitles

### "Could not connect to Plex server"

- Verify `PLEX_SERVER_URL` in `.env`
- Check if Plex is running
- Test the URL in your browser: `http://localhost:32400/web`

### "Error extracting subtitle"

- Some subtitle formats (e.g., PGS) can't be directly converted to SRT
- Try using a video with SRT or ASS/SSA subtitle tracks

### Webhook not triggering

1. Check Windows Firewall settings
2. Verify webhook URL in Plex settings
3. Test the endpoint:
   ```bash
   curl -X POST http://localhost:4000/webhook -d "payload={}"
   ```
4. Check server logs for incoming requests

### High OpenAI costs

- Use `gpt-4o-mini` instead of larger models (significantly cheaper)
- Reduce `MAX_TOKENS` if subtitles are short
- Current pricing (GPT-4o-mini):
  - Input: $0.15 per 1M tokens
  - Output: $0.60 per 1M tokens
  - Average movie: ~$0.01-0.05

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
└── README.md                # This file
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

