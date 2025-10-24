#!/usr/bin/env node

/**
 * Batch translate all video files in a folder
 * Usage: node translate-folder.js "path/to/folder" [language]
 */

require('dotenv/config');
const path = require('path');
const fs = require('fs');
const { extractSubtitle } = require('./src/subtitle-extractor');
const { translateSubtitle } = require('./src/translator');
const { logger } = require('./src/logger');

// Supported video extensions
const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node translate-folder.js <folder-path>');
    console.error('');
    console.error('Examples:');
    console.error('  node translate-folder.js "D:\\Movies\\Season 1"');
    console.error('');
    console.error('Note: Target language is configured in .env (TARGET_LANG)');
    process.exit(1);
  }

  const folderPath = path.resolve(args[0]);
  const targetLang = process.env.TARGET_LANG || 'English';

  return { folderPath, targetLang };
}

/**
 * Check if subtitle already exists
 */
function subtitleExists(videoPath, targetLang) {
  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath);
  const base = path.basename(videoPath, ext);
  
  const langCode = targetLang.toLowerCase().substring(0, 2);
  const possibleSubtitles = [
    path.join(dir, `${base}.${langCode}.srt`),
    path.join(dir, `${base}.${targetLang.toLowerCase()}.srt`)
  ];

  return possibleSubtitles.some(sub => fs.existsSync(sub));
}

/**
 * Get all video files in a folder (non-recursive)
 */
function getVideoFiles(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  const files = fs.readdirSync(folderPath);
  const videoFiles = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return VIDEO_EXTENSIONS.includes(ext);
    })
    .map(file => path.join(folderPath, file));

  return videoFiles;
}

/**
 * Translate a single video file
 */
async function translateVideoFile(videoPath, targetLang, index, total) {
  try {
    logger.info('');
    logger.info(`[${index}/${total}] Processing: ${path.basename(videoPath)}`);
    
    // Check if subtitle already exists
    if (subtitleExists(videoPath, targetLang)) {
      logger.info('✓ Subtitle already exists, skipping');
      return { success: true, skipped: true };
    }

    // Extract subtitle
    logger.info('  Extracting subtitle...');
    const extractedSubPath = await extractSubtitle(videoPath);
    
    if (!extractedSubPath) {
      logger.warn('  No embedded subtitles found, skipping');
      return { success: false, reason: 'No subtitles' };
    }

    // Translate subtitle
    logger.info(`  Translating to ${targetLang}...`);
    const translatedSubPath = await translateSubtitle(
      extractedSubPath,
      videoPath,
      targetLang
    );

    // Check if translation was skipped (language already matches)
    if (!translatedSubPath) {
      logger.info('  ✓ Skipped: Already in target language');
      return { success: true, skipped: true };
    }

    logger.info(`  ✓ Complete: ${path.basename(translatedSubPath)}`);
    return { success: true, skipped: false };

  } catch (error) {
    logger.error(`  ✗ Failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

/**
 * Main batch translation workflow
 */
async function main() {
  const { folderPath, targetLang } = parseArgs();
  const startTime = Date.now();

  try {
    logger.info('=================================');
    logger.info('Batch Subtitle Translation');
    logger.info('=================================');
    logger.info(`Folder: ${folderPath}`);
    logger.info(`Target language: ${targetLang}`);
    logger.info('=================================');

    // Get all video files
    const videoFiles = getVideoFiles(folderPath);
    
    if (videoFiles.length === 0) {
      logger.warn('No video files found in folder');
      process.exit(0);
    }

    logger.info(`Found ${videoFiles.length} video file(s)`);
    logger.info('');

    // Process each video file
    const results = {
      total: videoFiles.length,
      success: 0,
      skipped: 0,
      failed: 0
    };

    for (let i = 0; i < videoFiles.length; i++) {
      const result = await translateVideoFile(videoFiles[i], targetLang, i + 1, videoFiles.length);
      
      if (result.success) {
        if (result.skipped) {
          results.skipped++;
        } else {
          results.success++;
        }
      } else {
        results.failed++;
      }
    }

    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logger.info('');
    logger.info('=================================');
    logger.info('Batch Translation Complete');
    logger.info('=================================');
    logger.info(`Total files: ${results.total}`);
    logger.info(`Successfully translated: ${results.success}`);
    logger.info(`Skipped (already exists): ${results.skipped}`);
    logger.info(`Failed: ${results.failed}`);
    logger.info(`Total time: ${duration}s`);
    logger.info('=================================');

  } catch (error) {
    logger.error('Batch translation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

