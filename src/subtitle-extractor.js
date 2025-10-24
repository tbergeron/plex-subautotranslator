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
          logger.error('Error probing video file:', err);
          return reject(err);
        }

        // Find subtitle streams
        const subtitleStreams = metadata.streams.filter(
          stream => stream.codec_type === 'subtitle'
        );

        if (subtitleStreams.length === 0) {
          logger.info('No subtitle streams found in video');
          return resolve(null);
        }

        logger.info(`Found ${subtitleStreams.length} subtitle stream(s)`);
        logger.debug('Subtitle streams:', subtitleStreams.map(s => ({
          index: s.index,
          codec: s.codec_name,
          language: s.tags?.language || 'unknown'
        })));

        // Generate output path for extracted subtitle
        const dir = path.dirname(videoPath);
        const ext = path.extname(videoPath);
        const base = path.basename(videoPath, ext);
        const outputSrtPath = path.join(dir, `${base}.extracted.srt`);

        // Extract the first subtitle stream
        logger.info('Extracting subtitle stream...');
        
        ffmpeg(videoPath)
          .outputOptions([
            '-map', '0:s:0',  // Map first subtitle stream
            '-c:s', 'srt'      // Convert to SRT format
          ])
          .output(outputSrtPath)
          .on('start', (commandLine) => {
            logger.debug('FFmpeg command:', commandLine);
          })
          .on('end', () => {
            logger.info('Subtitle extraction completed');
            
            // Verify the file was created and has content
            if (fs.existsSync(outputSrtPath)) {
              const stats = fs.statSync(outputSrtPath);
              if (stats.size > 0) {
                logger.info(`Extracted subtitle size: ${stats.size} bytes`);
                resolve(outputSrtPath);
              } else {
                logger.warn('Extracted subtitle file is empty');
                fs.unlinkSync(outputSrtPath); // Clean up empty file
                resolve(null);
              }
            } else {
              logger.warn('Subtitle file was not created');
              resolve(null);
            }
          })
          .on('error', (err, stdout, stderr) => {
            logger.error('Error extracting subtitle:', err.message);
            logger.debug('FFmpeg stderr:', stderr);
            
            // Check if it's a "no suitable output format" error
            if (err.message.includes('Subtitle codec') || 
                err.message.includes('codec not currently supported')) {
              logger.warn('Subtitle codec not supported for direct extraction');
              resolve(null);
            } else {
              reject(err);
            }
          })
          .run();
      });
    } catch (error) {
      logger.error('Unexpected error in extractSubtitle:', error);
      reject(error);
    }
  });
}

module.exports = { extractSubtitle };

