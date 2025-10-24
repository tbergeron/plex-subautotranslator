#!/usr/bin/env node

/**
 * Standalone script to manually translate subtitles for a specific video file
 * Usage: node translate-file.js "path/to/video.mkv" [language]
 */

require('dotenv/config');
const path = require('path');
const fs = require('fs');
const { extractSubtitle } = require('./src/subtitle-extractor');
const { translateSubtitle } = require('./src/translator');
const { logger } = require('./src/logger');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node translate-file.js <video-file-path>');
    console.error('');
    console.error('Examples:');
    console.error('  node translate-file.js "D:\\Movies\\MyMovie.mkv"');
    console.error('');
    console.error('Note: Target language is configured in .env (TARGET_LANG)');
    process.exit(1);
  }

  // Strip surrounding quotes if present (Windows batch sometimes includes them)
  let inputPath = args[0];
  
  // Handle double quotes (when user enters "path" and batch adds another layer)
  while (inputPath.startsWith('"') && inputPath.endsWith('"') && inputPath.length > 1) {
    inputPath = inputPath.slice(1, -1);
  }
  
  console.error('[DEBUG] Path after quote removal:', inputPath);

  const videoPath = path.resolve(inputPath);
  const targetLang = process.env.TARGET_LANG || 'English';

  return { videoPath, targetLang };
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
          logger.info(`Subtitle is already in target language (${detectedLang}) - ${subtitlePath}`);
          return subtitlePath;
        } else {
          logger.info(`Subtitle is in ${detectedLang}, not ${targetLang}, will translate (${subtitlePath})`);
        }
      } catch (error) {
        logger.warn(`Could not detect language of existing subtitle (${subtitlePath}): ${error.message}`);
        // If we can't detect, assume it needs translation
      }
    }
  }

  return null;
}

/**
 * Main translation workflow
 */
async function main() {
  const { videoPath, targetLang } = parseArgs();
  const startTime = Date.now();

  try {
    logger.info('=================================');
    logger.info('Manual Subtitle Translation');
    logger.info('=================================');
    logger.info(`Video file: ${videoPath}`);
    logger.info(`Target language: ${targetLang}`);
    logger.info('=================================');

    // Verify video file exists
    if (!fs.existsSync(videoPath)) {
      logger.error(`Video file not found: ${videoPath}`);
      process.exit(1);
    }

    // Check if subtitle already exists in target language
    const existingSub = await subtitleExists(videoPath, targetLang);
    if (existingSub) {
      logger.info(`Subtitle already exists in target language: ${existingSub}`);
      logger.info(`Location: ${existingSub}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Do you want to overwrite it? (y/n): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        logger.info('Translation cancelled by user');
        process.exit(0);
      }

      // Delete existing subtitle
      fs.unlinkSync(existingSub);
      logger.info(`Deleted existing subtitle: ${existingSub}`);
    }

    // Step 1: Extract subtitle
    logger.info('Step 1: Extracting subtitle from video...');
    const extractedSubPath = await extractSubtitle(videoPath);
    
    if (!extractedSubPath) {
      logger.error(`No embedded subtitles found in video: ${videoPath}`);
      logger.info('');
      logger.info('Suggestions:');
      logger.info('- Check if the video has embedded subtitles');
      logger.info('- Try downloading subtitle files from online sources');
      logger.info('- Use a different video source with embedded subtitles');
      process.exit(1);
    }

    logger.info(`✓ Subtitle extracted: ${extractedSubPath}`);

    // Step 2: Translate subtitle
    logger.info(`Step 2: Translating subtitle to ${targetLang}...`);
    const translatedSubPath = await translateSubtitle(
      extractedSubPath,
      videoPath,
      targetLang
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Check if translation was skipped (language already matches)
    if (!translatedSubPath) {
      logger.info('');
      logger.info('=================================');
      logger.info('✓ Translation Skipped!');
      logger.info('=================================');
      logger.info('Subtitle is already in target language');
      logger.info(`Total time: ${duration}s`);
      logger.info('=================================');
      process.exit(0);
    }

    logger.info('');
    logger.info('=================================');
    logger.info('✓ Translation Complete!');
    logger.info('=================================');
    logger.info(`Translated subtitle: ${translatedSubPath}`);
    logger.info(`Total time: ${duration}s`);
    logger.info('=================================');

  } catch (error) {
    logger.error('Translation failed:', error.message);
    logger.debug('Error details:', error);
    process.exit(1);
  }
}

// Run the script
main();

