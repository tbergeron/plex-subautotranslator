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
  try {
    // First, probe the file to check if it has subtitles
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    // Find subtitle streams
    const subtitleStreams = metadata.streams.filter(
      stream => stream.codec_type === 'subtitle'
    );

    if (subtitleStreams.length === 0) {
      logger.info(`No subtitle streams found in video: ${videoPath}`);
      return null;
    }

    logger.info(`Found ${subtitleStreams.length} subtitle stream(s) in ${videoPath}`);
    logger.debug('Subtitle streams:', subtitleStreams.map(s => ({
      index: s.index,
      codec: s.codec_name,
      language: s.tags?.language || 'unknown'
    })));

    // Define supported text-based subtitle codecs
    const imageBasedCodecs = ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvdsub'];
    
    // Generate output path for extracted subtitle
    const dir = path.dirname(videoPath);
    const ext = path.extname(videoPath);
    const base = path.basename(videoPath, ext);
    const outputSrtPath = path.join(dir, `${base}.extracted.srt`);

    // Try to extract from each subtitle stream until one succeeds
    for (let i = 0; i < subtitleStreams.length; i++) {
      const stream = subtitleStreams[i];
      const codecName = stream.codec_name;
      
      logger.info(`Attempting to extract subtitle stream ${i + 1}/${subtitleStreams.length} (index: ${stream.index}, codec: ${codecName || 'unknown'}, language: ${stream.tags?.language || 'unknown'})`);
      
      // Skip image-based subtitles
      if (imageBasedCodecs.includes(codecName)) {
        logger.warn(`Subtitle codec '${codecName}' is image-based and cannot be converted to text. Skipping to next stream.`);
        continue;
      }
      
      // Try to extract this stream with various methods
      const result = await tryExtractStream(videoPath, stream, outputSrtPath);
      
      if (result) {
        logger.info(`Successfully extracted subtitle from stream ${i + 1} (index: ${stream.index})`);
        return result;
      } else {
        logger.warn(`Failed to extract subtitle from stream ${i + 1} (index: ${stream.index}). Trying next stream...`);
      }
    }
    
    logger.warn(`Could not extract subtitles from any of the ${subtitleStreams.length} subtitle stream(s) in ${videoPath}`);
    return null;
    
  } catch (error) {
    logger.error(`Unexpected error in extractSubtitle for ${videoPath}:`, error);
    throw error;
  }
}

/**
 * Try to extract a subtitle stream using various methods
 * @param {string} videoPath - Path to the video file
 * @param {object} stream - The subtitle stream object from ffprobe
 * @param {string} outputPath - Output path for the extracted subtitle
 * @returns {Promise<string|null>}
 */
async function tryExtractStream(videoPath, stream, outputPath) {
  const codecName = stream.codec_name;
  const streamIndex = stream.index;
  
  // Define known text-based subtitle codecs
  const textBasedCodecs = ['subrip', 'srt', 'ass', 'ssa', 'mov_text', 'text', 'webvtt', 'wvtt'];
  
  // For known text-based codecs, try standard conversion first
  if (textBasedCodecs.includes(codecName)) {
    logger.debug(`Trying standard SRT conversion for codec '${codecName}'...`);
    const result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { codec: 'srt' });
    if (result) return result;
  }
  
  // For unknown/none codecs, try each text-based codec
  if (!codecName || codecName === 'none' || codecName === 'unknown' || !textBasedCodecs.includes(codecName)) {
    logger.info(`Codec is '${codecName || 'unknown'}'. Trying multiple extraction methods...`);
    
    // Try forcing output format to SRT
    logger.debug(`Attempt 1: Forcing SRT format...`);
    let result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { format: 'srt' });
    if (result) return result;
    
    // Try each text-based codec
    const codecsToTry = ['srt', 'webvtt', 'ass', 'mov_text', 'text'];
    for (const codec of codecsToTry) {
      logger.debug(`Attempt: Converting to codec '${codec}'...`);
      result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { codec });
      if (result) return result;
    }
    
    // Try copying the stream as-is
    logger.debug(`Attempt: Copying subtitle stream without conversion...`);
    result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { copy: true });
    if (result) return result;
    
    // Try with text subtitle decoder
    logger.debug(`Attempt: Using text subtitle decoder...`);
    result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { codec: 'text' });
    if (result) return result;
  }
  
  return null;
}

/**
 * Try a specific extraction method
 * @param {string} videoPath - Path to the video file
 * @param {number} streamIndex - Index of the subtitle stream
 * @param {string} outputPath - Output path for the extracted subtitle
 * @param {object} options - Extraction options { codec?, format?, copy? }
 * @returns {Promise<string|null>}
 */
function tryExtractionMethod(videoPath, streamIndex, outputPath, options = {}) {
  return new Promise((resolve) => {
    // Clean up any existing output file
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (err) {
        logger.debug(`Could not delete existing file: ${outputPath}`);
      }
    }
    
    const command = ffmpeg(videoPath);
    const outputOptions = ['-map', `0:${streamIndex}`];
    
    if (options.copy) {
      outputOptions.push('-c:s', 'copy');
    } else if (options.codec) {
      outputOptions.push('-c:s', options.codec);
    }
    
    if (options.format) {
      outputOptions.push('-f', options.format);
    }
    
    // Add common options to handle edge cases
    outputOptions.push('-avoid_negative_ts', 'make_zero');
    
    command
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('start', (commandLine) => {
        logger.debug('FFmpeg command:', commandLine);
      })
      .on('end', () => {
        // Verify the file was created and has content
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            logger.info(`Extraction succeeded: ${outputPath} (${stats.size} bytes)`);
            resolve(outputPath);
          } else {
            logger.debug(`Extracted file is empty`);
            fs.unlinkSync(outputPath);
            resolve(null);
          }
        } else {
          logger.debug(`Output file was not created`);
          resolve(null);
        }
      })
      .on('error', (err, stdout, stderr) => {
        logger.debug(`Extraction method failed: ${err.message}`);
        // Clean up failed output file
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch (cleanupErr) {
            // Ignore cleanup errors
          }
        }
        resolve(null);
      })
      .run();
  });
}

module.exports = { extractSubtitle };

