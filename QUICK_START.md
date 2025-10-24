# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- ✅ Windows 10
- ✅ Plex Media Server installed
- ✅ OpenAI API key

## Installation Steps

### 1. Install Node.js

Download and install from: https://nodejs.org/ (LTS version)

### 2. Install Dependencies

Double-click `install.bat`

### 3. Configure Settings

Edit the `.env` file that was created:

```env
# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-your_key_here

# Your Plex token (see below how to get it)
PLEX_TOKEN=your_plex_token

# Optional: Restrict to specific folders (comma-separated)
# Leave blank to process all Plex libraries
ALLOWED_PATHS=D:\Plex\Movies,E:\Plex\TV Shows

# What language to translate to
TARGET_LANG=English
```

#### How to Get Your Plex Token:

1. Open Plex in browser
2. Play any video
3. Click "..." → "Get Info" → "View XML"
4. Look for `X-Plex-Token=` in the URL
5. Copy that token to your `.env` file

### 4. Allow Firewall Access

Open Command Prompt **as Administrator** and run:

```cmd
netsh advfirewall firewall add rule name="Plex Subtitle Translator" dir=in action=allow protocol=TCP localport=4000
```

### 5. Add Plex Webhook

1. Open Plex → Settings → Webhooks
2. Add webhook: `http://localhost:4000/webhook`
3. Save

### 6. Start the Service

**Choose one:**

**A) Plex Webhook Mode:**
- Double-click `start.bat` (requires webhook setup from step 5)

**B) File System Daemon Mode (No Plex needed):**
- Set `WATCH_PATHS` in `.env`: `WATCH_PATHS=D:\Plex\Movies,E:\Plex\TV Shows`
- Double-click `daemon.bat`

## That's It!

When you add new media to Plex, the service will:
1. 🎬 Detect the new file
2. 📝 Extract embedded subtitles
3. 🌍 Translate to your target language
4. 💾 Save as `.en.srt` next to the video
5. 🔄 Refresh Plex library

## Test It

1. Add a video with embedded subtitles to Plex
2. Watch the console window
3. Check the video folder for the new `.en.srt` file
4. Play the video in Plex and select the translated subtitle

## Translate Existing Media

Want to translate subtitles for videos already in your library?

**Single File:**
- Drag and drop a video file onto `translate-file.bat`
- OR double-click `translate-file.bat` and enter path when prompted

**Entire Folder (TV Season):**
- Drag and drop a folder onto `translate-folder.bat`
- OR double-click `translate-folder.bat` and enter path when prompted

**Command Line:**
```cmd
translate-file.bat "D:\Movies\MyMovie.mkv"
translate-folder.bat "D:\TV Shows\Season 1"
```

**Tip:** You can also drag & drop files/folders directly into the Command Prompt window when prompted!

## Common Issues

**"Node is not recognized..."**
→ Restart your computer after installing Node.js

**"Cannot find module..."**
→ Run `install.bat` again

**"ECONNREFUSED"**
→ Make sure Plex is running

**Webhook not working**
→ Check Windows Firewall settings

## Need More Help?

See `WINDOWS_SETUP.md` for detailed instructions or `README.md` for full documentation.

## Cost

Very cheap! With GPT-4o-mini:
- Full movie subtitle: ~$0.01-0.05
- TV episode: ~$0.005-0.02

---

**Happy translating! 🎉**

