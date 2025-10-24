const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { logger } = require('./logger');

// Set ffmpeg path to the static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Extract the first subtitle track from a video file
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<string|null>} - Path to the extracted subtitle file, or null if no subtitles found
 */
async function extractSubtitle(videoPath) {
  return new Promise((resolve, reject) => {
    try {
      // First, probe the file to check if it has subtitles
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error(`Error probing video file (${videoPath}):`, err);
          return reject(err);
        }

        // Find subtitle streams
        const subtitleStreams = metadata.streams.filter(
          stream => stream.codec_type === 'subtitle'
        );

        if (subtitleStreams.length === 0) {
          logger.info(`No subtitle streams found in video: ${videoPath}`);
          return resolve(null);
        }

        logger.info(`Found ${subtitleStreams.length} subtitle stream(s) in ${videoPath}`);
        logger.debug('Subtitle streams:', subtitleStreams.map(s => ({
          index: s.index,
          codec: s.codec_name,
          language: s.tags?.language || 'unknown'
        })));

        // Check the codec of the first subtitle stream
        const firstSubtitle = subtitleStreams[0];
        const codecName = firstSubtitle.codec_name;
        
        // Define supported text-based subtitle codecs
        const textBasedCodecs = ['subrip', 'srt', 'ass', 'ssa', 'mov_text', 'text', 'webvtt', 'wvtt'];
        const imageBasedCodecs = ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvdsub'];
        
        // Skip image-based subtitles
        if (imageBasedCodecs.includes(codecName)) {
          logger.warn(`Subtitle codec '${codecName}' is image-based and cannot be converted to text. Skipping.`);
          return resolve(null);
        }
        
        // Warn about unknown codecs
        if (!codecName || codecName === 'none' || codecName === 'unknown') {
          logger.warn(`Subtitle codec is unknown or 'none'. Will attempt extraction with text codec...`);
        }

        // Generate output path for extracted subtitle
        const dir = path.dirname(videoPath);
        const ext = path.extname(videoPath);
        const base = path.basename(videoPath, ext);
        const outputSrtPath = path.join(dir, `${base}.extracted.srt`);

        // Extract the first subtitle stream
        logger.info(`Extracting subtitle stream (codec: ${codecName || 'unknown'}) from ${videoPath} to ${outputSrtPath}...`);
        
        const command = ffmpeg(videoPath);
        
        // For text-based codecs or unknown codecs, try conversion to SRT
        if (textBasedCodecs.includes(codecName) || !codecName || codecName === 'none') {
          command.outputOptions([
            '-map', `0:${firstSubtitle.index}`,  // Map the specific subtitle stream by index
            '-c:s', 'srt'      // Convert to SRT format
          ]);
        } else {
          // For other codecs, try to copy first, then convert if that fails
          logger.debug(`Attempting to copy subtitle codec '${codecName}' directly...`);
          command.outputOptions([
            '-map', `0:${firstSubtitle.index}`,
            '-c:s', 'copy'      // Try copying first
          ]);
        }
        
        command
          .output(outputSrtPath)
          .on('start', (commandLine) => {
            logger.debug('FFmpeg command:', commandLine);
          })
          .on('end', () => {
            logger.info(`Subtitle extraction completed: ${outputSrtPath}`);
            
            // Verify the file was created and has content
            if (fs.existsSync(outputSrtPath)) {
              const stats = fs.statSync(outputSrtPath);
              if (stats.size > 0) {
                logger.info(`Extracted subtitle size: ${stats.size} bytes (${outputSrtPath})`);
                resolve(outputSrtPath);
              } else {
                logger.warn(`Extracted subtitle file is empty: ${outputSrtPath}`);
                fs.unlinkSync(outputSrtPath); // Clean up empty file
                resolve(null);
              }
            } else {
              logger.warn(`Subtitle file was not created: ${outputSrtPath}`);
              resolve(null);
            }
          })
          .on('error', (err, stdout, stderr) => {
            logger.error(`Error extracting subtitle from ${videoPath}:`, err.message);
            logger.debug('FFmpeg stderr:', stderr);
            
            // Check if it's a decoder error and try alternative extraction
            if (err.message.includes('decoder') || 
                err.message.includes('codec none') ||
                err.message.includes('not found for input stream')) {
              logger.warn(`Decoder error for codec '${codecName}'. Attempting alternative extraction...`);
              // Try extracting with text subtitle decoder as fallback
              tryAlternativeExtraction(videoPath, firstSubtitle.index, outputSrtPath)
                .then(resolve)
                .catch(() => {
                  logger.error(`Alternative extraction also failed for ${videoPath}`);
                  resolve(null);
                });
            } else if (err.message.includes('Subtitle codec') || 
                err.message.includes('codec not currently supported')) {
              logger.warn(`Subtitle codec not supported for direct extraction from ${videoPath}`);
              resolve(null);
            } else {
              reject(err);
            }
          })
          .run();
      });
    } catch (error) {
      logger.error(`Unexpected error in extractSubtitle for ${videoPath}:`, error);
      reject(error);
    }
  });
}

/**
 * Try alternative extraction methods when the standard approach fails
 * @param {string} videoPath - Path to the video file
 * @param {number} streamIndex - Index of the subtitle stream
 * @param {string} outputPath - Output path for the extracted subtitle
 * @returns {Promise<string|null>}
 */
function tryAlternativeExtraction(videoPath, streamIndex, outputPath) {
  return new Promise((resolve, reject) => {
    logger.info(`Trying alternative extraction method for stream ${streamIndex}...`);
    
    // Try using -c:s text or forcing subtitle format
    ffmpeg(videoPath)
      .outputOptions([
        '-map', `0:${streamIndex}`,
        '-f', 'srt',           // Force output format to SRT
        '-avoid_negative_ts', 'make_zero'  // Handle timing issues
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        logger.debug('Alternative FFmpeg command:', commandLine);
      })
      .on('end', () => {
        logger.info(`Alternative extraction succeeded: ${outputPath}`);
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            resolve(outputPath);
          } else {
            fs.unlinkSync(outputPath);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      })
      .on('error', (err, stdout, stderr) => {
        logger.error(`Alternative extraction failed:`, err.message);
        logger.debug('FFmpeg stderr:', stderr);
        reject(err);
      })
      .run();
  });
}

module.exports = { extractSubtitle };

