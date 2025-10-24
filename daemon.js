#!/usr/bin/env node

/**
 * File System Daemon - Watches directories for new video files
 * Automatically translates subtitles when new videos are detected
 */

require('dotenv/config');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { extractSubtitle } = require('./src/subtitle-extractor');
const { translateSubtitle } = require('./src/translator');
const { logger } = require('./src/logger');

// Configuration
const CONFIG = {
  TARGET_LANG: process.env.TARGET_LANG || 'English',
  WATCH_PATHS: process.env.WATCH_PATHS || process.env.ALLOWED_PATHS || '',
  // Delay before processing (wait for file copy to complete)
  STABLE_THRESHOLD: parseInt(process.env.FILE_STABLE_THRESHOLD) || 5000,
  // Debounce delay to avoid multiple triggers
  DEBOUNCE_DELAY: parseInt(process.env.DEBOUNCE_DELAY) || 2000
};

// Supported video extensions
const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

// Track files being processed to avoid duplicates
const processingFiles = new Set();
const processedFiles = new Set();

// Debounce timers
const debounceTimers = new Map();

/**
 * Check if a file is a video file
 */
function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Check if subtitle already exists in the target language
 */
async function subtitleExists(videoPath, targetLang) {
  const { detectSubtitleLanguage, languagesMatch } = require('./src/translator');
  
  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath);
  const base = path.basename(videoPath, ext);
  
  const langCode = targetLang.toLowerCase().substring(0, 2);
  const possibleSubtitles = [
    path.join(dir, `${base}.${langCode}.srt`),
    path.join(dir, `${base}.${targetLang.toLowerCase()}.srt`),
    path.join(dir, `${base}.srt`)
  ];

  for (const subtitlePath of possibleSubtitles) {
    if (fs.existsSync(subtitlePath)) {
      logger.info(`Found existing subtitle: ${subtitlePath}`);
      
      // Verify the subtitle is in the target language
      try {
        const detectedLang = await detectSubtitleLanguage(subtitlePath);
        if (languagesMatch(detectedLang, targetLang)) {
          logger.info(`Subtitle is already in target language (${detectedLang}), skipping`);
          return true;
        } else {
          logger.info(`Subtitle is in ${detectedLang}, not ${targetLang}, will translate`);
        }
      } catch (error) {
        logger.warn(`Could not detect language of existing subtitle (${subtitlePath}): ${error.message}`);
        // If we can't detect, assume it needs translation
      }
    }
  }

  return false;
}

/**
 * Wait for file to be stable (fully copied)
 */
async function waitForStableFile(filePath, threshold = CONFIG.STABLE_THRESHOLD) {
  let lastSize = -1;
  let stableCount = 0;
  const requiredStableChecks = 3;

  logger.debug(`Waiting for file to stabilize: ${filePath}`);

  while (stableCount < requiredStableChecks) {
    await new Promise(resolve => setTimeout(resolve, threshold / requiredStableChecks));
    
    try {
      if (!fs.existsSync(filePath)) {
        logger.debug('File no longer exists, aborting');
        return false;
      }

      const stats = fs.statSync(filePath);
      const currentSize = stats.size;

      if (currentSize === lastSize && currentSize > 0) {
        stableCount++;
      } else {
        stableCount = 0;
        lastSize = currentSize;
      }
    } catch (error) {
      logger.debug('Error checking file stability:', error.message);
      return false;
    }
  }

  logger.debug('File is stable and ready for processing');
  return true;
}

/**
 * Process a new video file
 */
async function processVideoFile(videoPath) {
  // Check if already processing or processed
  if (processingFiles.has(videoPath)) {
    logger.debug(`Already processing: ${videoPath}`);
    return;
  }

  if (processedFiles.has(videoPath)) {
    logger.debug(`Already processed: ${videoPath}`);
    return;
  }

  processingFiles.add(videoPath);
  const startTime = Date.now();

  try {
    logger.info('=================================');
    logger.info('New video file detected');
    logger.info('=================================');
    logger.info(`File: ${videoPath}`);

    // Wait for file to be fully copied
    const isStable = await waitForStableFile(videoPath);
    if (!isStable) {
      logger.warn(`File is not stable or no longer exists, skipping: ${videoPath}`);
      processingFiles.delete(videoPath);
      return;
    }

    // Check if subtitle already exists in target language
    if (await subtitleExists(videoPath, CONFIG.TARGET_LANG)) {
      logger.info('Subtitle already exists in target language, skipping');
      processedFiles.add(videoPath);
      processingFiles.delete(videoPath);
      return;
    }

    // Extract subtitle
    logger.info('Step 1: Extracting subtitle from video...');
    const extractedSubPath = await extractSubtitle(videoPath);
    
    if (!extractedSubPath) {
      logger.warn(`No embedded subtitles found in video: ${videoPath}`);
      processedFiles.add(videoPath);
      processingFiles.delete(videoPath);
      return;
    }

    logger.info(`Subtitle extracted: ${extractedSubPath}`);

    // Translate subtitle
    logger.info(`Step 2: Translating subtitle to ${CONFIG.TARGET_LANG}...`);
    const translatedSubPath = await translateSubtitle(
      extractedSubPath,
      videoPath,
      CONFIG.TARGET_LANG
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Check if translation was performed or skipped
    if (!translatedSubPath) {
      logger.info('=================================');
      logger.info('Translation skipped!');
      logger.info('Subtitle already in target language');
      logger.info(`Processing time: ${duration}s`);
      logger.info('=================================');
    } else {
      logger.info('=================================');
      logger.info('Translation complete!');
      logger.info(`Translated subtitle: ${translatedSubPath}`);
      logger.info(`Processing time: ${duration}s`);
      logger.info('=================================');
    }

    // Mark as processed
    processedFiles.add(videoPath);

  } catch (error) {
    logger.error(`Error processing video file (${videoPath}):`, error.message);
    logger.debug('Error details:', error);
  } finally {
    processingFiles.delete(videoPath);
  }
}

/**
 * Handle file addition with debouncing
 */
function handleFileAdded(filePath) {
  // Clear existing timer
  if (debounceTimers.has(filePath)) {
    clearTimeout(debounceTimers.get(filePath));
  }

  // Set new debounce timer
  const timer = setTimeout(() => {
    debounceTimers.delete(filePath);
    processVideoFile(filePath).catch(err => {
      logger.error('Unhandled error in processVideoFile:', err);
    });
  }, CONFIG.DEBOUNCE_DELAY);

  debounceTimers.set(filePath, timer);
}

/**
 * Start the file system watcher
 */
function startDaemon() {
  // Parse watch paths
  const watchPaths = CONFIG.WATCH_PATHS
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (watchPaths.length === 0) {
    logger.error('No watch paths configured!');
    logger.error('Please set WATCH_PATHS in your .env file');
    logger.error('Example: WATCH_PATHS=D:\\Plex\\Movies,E:\\Plex\\TV Shows');
    process.exit(1);
  }

  logger.info('=================================');
  logger.info('Subtitle Translation Daemon');
  logger.info('=================================');
  logger.info(`Target language: ${CONFIG.TARGET_LANG}`);
  logger.info(`Watching ${watchPaths.length} path(s):`);
  watchPaths.forEach(p => logger.info(`  - ${p}`));
  logger.info(`File stable threshold: ${CONFIG.STABLE_THRESHOLD}ms`);
  logger.info(`Debounce delay: ${CONFIG.DEBOUNCE_DELAY}ms`);
  logger.info('=================================');
  logger.info('Starting file system watcher...');

  // Verify paths exist
  const validPaths = [];
  for (const watchPath of watchPaths) {
    if (fs.existsSync(watchPath)) {
      validPaths.push(watchPath);
      logger.info(`✓ Path exists: ${watchPath}`);
    } else {
      logger.warn(`✗ Path not found: ${watchPath}`);
    }
  }

  if (validPaths.length === 0) {
    logger.error('No valid paths to watch!');
    process.exit(1);
  }

  logger.info('=================================');
  logger.info('Daemon is running. Press Ctrl+C to stop.');
  logger.info('Watching for new video files...');
  logger.info('=================================');

  // Create watcher
  const watcher = chokidar.watch(validPaths, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't process existing files on startup
    awaitWriteFinish: false, // We handle stability ourselves
    depth: 10 // Watch subdirectories
  });

  // Watch for new files
  watcher
    .on('add', filePath => {
      if (isVideoFile(filePath)) {
        logger.info(`New file detected: ${filePath}`);
        handleFileAdded(filePath);
      }
    })
    .on('error', error => {
      logger.error('Watcher error:', error);
    })
    .on('ready', () => {
      logger.info('Initial scan complete. Ready for new files.');
    });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    watcher.close();
    process.exit(0);
  });
}

// Start the daemon
startDaemon();

