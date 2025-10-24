require('dotenv/config');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractSubtitle } = require('./src/subtitle-extractor');
const { translateSubtitle } = require('./src/translator');
const { refreshPlexLibrary } = require('./src/plex-api');
const { logger } = require('./src/logger');

const app = express();
const upload = multer();

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 4000,
  TARGET_LANG: process.env.TARGET_LANG || 'English',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Optional: Comma-separated list of allowed media paths for security
  ALLOWED_PATHS: process.env.ALLOWED_PATHS ? process.env.ALLOWED_PATHS.split(',').map(p => p.trim()) : []
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'plex-subautotranslator',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for Plex
app.post('/webhook', upload.single('thumb'), async (req, res) => {
  try {
    logger.info('Received webhook from Plex');
    
    // Parse the payload (Plex sends it as form data with 'payload' field)
    let payload;
    if (req.body.payload) {
      payload = JSON.parse(req.body.payload);
    } else {
      payload = req.body;
    }

    logger.debug('Webhook payload:', JSON.stringify(payload, null, 2));

    // Check if this is a library.new or media.added event
    const event = payload.event;
    if (!event || (event !== 'library.new' && event !== 'media.scanned')) {
      logger.info(`Ignoring event: ${event}`);
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Extract metadata
    const metadata = payload.Metadata;
    if (!metadata) {
      logger.warn('No metadata found in webhook payload');
      return res.status(200).json({ message: 'No metadata' });
    }

    // Only process movies and TV shows
    const type = metadata.type;
    if (type !== 'movie' && type !== 'episode') {
      logger.info(`Ignoring media type: ${type}`);
      return res.status(200).json({ message: 'Media type not supported' });
    }

    // Get the file path
    const filePath = getMediaFilePath(metadata);
    if (!filePath) {
      logger.warn('Could not determine file path from metadata');
      return res.status(200).json({ message: 'No file path found' });
    }

    logger.info(`Processing media file: ${filePath}`);

    // Extract section ID for library refresh
    const sectionId = metadata.librarySectionID;

    // Respond immediately to Plex
    res.status(200).json({ message: 'Processing started' });

    // Process the subtitle in the background
    processSubtitle(filePath, sectionId).catch(err => {
      logger.error('Error processing subtitle:', err);
    });

  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Extract the file path from Plex metadata
 */
function getMediaFilePath(metadata) {
  try {
    // Plex includes the file path in Media.Part array
    if (metadata.Media && metadata.Media.length > 0) {
      const media = metadata.Media[0];
      if (media.Part && media.Part.length > 0) {
        const part = media.Part[0];
        return part.file;
      }
    }
    return null;
  } catch (error) {
    logger.error('Error extracting file path:', error);
    return null;
  }
}

/**
 * Check if a subtitle file already exists
 */
function subtitleExists(videoPath, targetLang) {
  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath);
  const base = path.basename(videoPath, ext);
  
  // Check for various subtitle naming conventions
  const possibleSubtitles = [
    path.join(dir, `${base}.srt`),
    path.join(dir, `${base}.${targetLang}.srt`),
    path.join(dir, `${base}.${targetLang.toLowerCase()}.srt`),
    path.join(dir, `${base}.en.srt`)
  ];

  for (const subtitlePath of possibleSubtitles) {
    if (fs.existsSync(subtitlePath)) {
      logger.info(`Subtitle already exists: ${subtitlePath}`);
      return true;
    }
  }

  return false;
}

/**
 * Check if the video path is in an allowed directory
 */
function isPathAllowed(videoPath) {
  // If no allowed paths configured, allow all
  if (CONFIG.ALLOWED_PATHS.length === 0) {
    return true;
  }
  
  // Check if the video path starts with any of the allowed paths
  return CONFIG.ALLOWED_PATHS.some(allowedPath => {
    // Normalize paths for comparison (handle both forward and back slashes)
    const normalizedVideoPath = videoPath.replace(/\\/g, '/').toLowerCase();
    const normalizedAllowedPath = allowedPath.replace(/\\/g, '/').toLowerCase();
    return normalizedVideoPath.startsWith(normalizedAllowedPath);
  });
}

/**
 * Main subtitle processing workflow
 */
async function processSubtitle(videoPath, sectionId) {
  const startTime = Date.now();
  
  try {
    logger.info('=== Starting subtitle processing ===');
    logger.info(`Video path: ${videoPath}`);

    // Check if path is allowed (security feature)
    if (!isPathAllowed(videoPath)) {
      logger.warn(`Video path not in allowed paths: ${videoPath}`);
      logger.info('Skipping processing for security reasons');
      return;
    }

    // Verify the video file exists
    if (!fs.existsSync(videoPath)) {
      logger.error(`Video file not found: ${videoPath}`);
      return;
    }

    // Check if subtitle already exists
    if (subtitleExists(videoPath, CONFIG.TARGET_LANG)) {
      logger.info('Subtitle already exists, skipping translation');
      return;
    }

    // Step 1: Extract subtitle from video
    logger.info('Step 1: Extracting subtitle from video...');
    const extractedSubPath = await extractSubtitle(videoPath);
    
    if (!extractedSubPath) {
      logger.warn('No embedded subtitles found in video');
      return;
    }

    logger.info(`Subtitle extracted to: ${extractedSubPath}`);

    // Step 2: Translate subtitle
    logger.info(`Step 2: Translating subtitle to ${CONFIG.TARGET_LANG}...`);
    const translatedSubPath = await translateSubtitle(
      extractedSubPath,
      videoPath,
      CONFIG.TARGET_LANG
    );

    // Check if translation was performed or skipped
    if (!translatedSubPath) {
      logger.info('Translation skipped - subtitle already in target language');
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      logger.info('=== Subtitle processing complete ===');
      logger.info(`Total processing time: ${duration}s`);
      return;
    }

    logger.info(`Translation complete: ${translatedSubPath}`);

    // Step 3: Refresh Plex library (optional)
    if (sectionId && process.env.PLEX_TOKEN) {
      logger.info('Step 3: Refreshing Plex library...');
      await refreshPlexLibrary(sectionId);
      logger.info('Library refresh triggered');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    logger.info('=== Subtitle processing complete ===');
    logger.info(`Total processing time: ${duration}s`);

  } catch (error) {
    logger.error('Error in processSubtitle:', error);
    throw error;
  }
}

// Start server
app.listen(CONFIG.PORT, () => {
  logger.info('=================================');
  logger.info('Plex Subtitle Auto-Translator');
  logger.info('=================================');
  logger.info(`Server listening on port ${CONFIG.PORT}`);
  logger.info(`Target language: ${CONFIG.TARGET_LANG}`);
  if (CONFIG.ALLOWED_PATHS.length > 0) {
    logger.info(`Allowed media paths: ${CONFIG.ALLOWED_PATHS.length} configured`);
    CONFIG.ALLOWED_PATHS.forEach(p => logger.info(`  - ${p}`));
  } else {
    logger.info('Allowed media paths: All paths allowed');
  }
  logger.info('Waiting for Plex webhooks...');
  logger.info('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

