const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { logger } = require('./logger');

const execFileAsync = promisify(execFile);

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
 * Check if mkvextract is available
 * @returns {Promise<boolean>}
 */
async function isMkvExtractAvailable() {
  try {
    await execFileAsync('mkvextract', ['--version']);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract subtitle using mkvextract (best for MKV files)
 * @param {string} videoPath - Path to the video file
 * @param {number} streamIndex - Index of the subtitle stream
 * @param {string} outputPath - Output path for the extracted subtitle
 * @returns {Promise<string|null>}
 */
async function extractWithMkvExtract(videoPath, streamIndex, outputPath) {
  try {
    logger.info(`    Using mkvextract to extract track ${streamIndex}...`);
    
    // Extract to .vtt file first (mkvextract determines format based on content)
    const dir = path.dirname(outputPath);
    const base = path.basename(outputPath, '.srt');
    const vttPath = path.join(dir, `${base}.vtt`);
    
    // Clean up any existing files
    [vttPath, outputPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          logger.debug(`    Could not delete ${filePath}: ${err.message}`);
        }
      }
    });
    
    // mkvextract tracks input.mkv streamIndex:output.vtt
    const args = ['tracks', videoPath, `${streamIndex}:${vttPath}`];
    logger.debug(`    mkvextract command: mkvextract ${args.join(' ')}`);
    
    const { stdout, stderr } = await execFileAsync('mkvextract', args, {
      timeout: 60000, // 60 second timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stdout) logger.debug(`    mkvextract stdout: ${stdout}`);
    if (stderr) logger.debug(`    mkvextract stderr: ${stderr}`);
    
    // Check if the file was created
    if (!fs.existsSync(vttPath)) {
      logger.info(`    ✗ FAILED - mkvextract did not create output file`);
      return null;
    }
    
    const stats = fs.statSync(vttPath);
    if (stats.size === 0) {
      logger.info(`    ✗ FAILED - Extracted file is empty`);
      fs.unlinkSync(vttPath);
      return null;
    }
    
    logger.info(`    ✓ Extracted ${stats.size} byte subtitle file`);
    
    // Check if it's already .srt or needs conversion
    const fileExt = path.extname(vttPath).toLowerCase();
    if (fileExt === '.srt' || vttPath === outputPath) {
      logger.info(`    ✓ Subtitle is already in SRT format`);
      if (vttPath !== outputPath) {
        fs.renameSync(vttPath, outputPath);
      }
      return outputPath;
    }
    
    // Convert to SRT using ffmpeg
    logger.info(`    Converting extracted subtitle to SRT...`);
    const converted = await convertSubtitleToSrt(vttPath, outputPath);
    
    // Clean up the intermediate file
    try {
      fs.unlinkSync(vttPath);
    } catch (err) {
      logger.debug(`    Could not delete intermediate file: ${err.message}`);
    }
    
    return converted;
    
  } catch (error) {
    logger.info(`    ✗ FAILED - ${error.message}`);
    logger.debug(`    mkvextract error details:`, error);
    return null;
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
  
  logger.info(`Trying multiple extraction methods for codec '${codecName || 'unknown'}'...`);
  
  const dir = path.dirname(outputPath);
  const base = path.basename(outputPath, '.srt');
  
  // Check if this is an MKV file and if mkvextract is available
  const fileExt = path.extname(videoPath).toLowerCase();
  const isMkvFile = fileExt === '.mkv';
  
  if (isMkvFile) {
    const hasMkvExtract = await isMkvExtractAvailable();
    
    if (hasMkvExtract) {
      logger.info(`  Method 1: Using mkvextract (MKV-specific tool)...`);
      const result = await extractWithMkvExtract(videoPath, streamIndex, outputPath);
      if (result) return result;
    } else {
      logger.info(`  mkvextract not available, falling back to ffmpeg methods`);
    }
  }
  
  // Try extracting to various native formats with copy (no re-encoding) using ffmpeg
  const formatsToTry = [
    { ext: 'vtt', desc: 'WebVTT' },
    { ext: 'srt', desc: 'SRT' },
    { ext: 'ass', desc: 'ASS' },
    { ext: 'ssa', desc: 'SSA' }
  ];
  
  let methodNum = isMkvFile ? 2 : 1; // Adjust method numbering based on whether mkvextract was tried
  
  for (let i = 0; i < formatsToTry.length; i++) {
    const format = formatsToTry[i];
    const tempOutput = path.join(dir, `${base}.${format.ext}`);
    logger.info(`  Method ${methodNum++}: Extracting as ${format.desc} with copy...`);
    let result = await tryExtractionMethod(videoPath, streamIndex, tempOutput, { 
      copy: true, 
      fixSubDuration: true 
    });
    
    // If we got a .vtt or other format, try to convert it to .srt
    if (result && format.ext !== 'srt') {
      logger.info(`    Got ${format.ext} file, converting to SRT...`);
      const converted = await convertSubtitleToSrt(result, outputPath);
      if (converted) {
        // Clean up the intermediate file
        try { fs.unlinkSync(result); } catch (e) {}
        return outputPath;
      }
    } else if (result) {
      return result;
    }
  }
  
  // Try with SRT codec and fix_sub_duration
  logger.info(`  Method ${methodNum++}: Converting to SRT with fix_sub_duration...`);
  let result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { 
    codec: 'srt', 
    fixSubDuration: true 
  });
  if (result) return result;
  
  // Try forcing SRT format with fix_sub_duration
  logger.info(`  Method ${methodNum++}: Forcing SRT format with fix_sub_duration...`);
  result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { 
    format: 'srt',
    fixSubDuration: true 
  });
  if (result) return result;
  
  // Try each text-based codec with fix_sub_duration
  const codecsToTry = ['webvtt', 'ass', 'subrip', 'mov_text', 'text'];
  for (let i = 0; i < codecsToTry.length; i++) {
    const codec = codecsToTry[i];
    logger.info(`  Method ${methodNum++}: Converting with codec '${codec}' and fix_sub_duration...`);
    result = await tryExtractionMethod(videoPath, streamIndex, outputPath, { 
      codec,
      fixSubDuration: true 
    });
    if (result) return result;
  }
  
  logger.warn(`All extraction methods failed for stream index ${streamIndex}`);
  return null;
}

/**
 * Convert a subtitle file to SRT format
 * @param {string} inputPath - Path to input subtitle file
 * @param {string} outputPath - Path to output SRT file
 * @returns {Promise<string|null>}
 */
async function convertSubtitleToSrt(inputPath, outputPath) {
  return new Promise((resolve) => {
    try {
      logger.debug(`    Converting ${inputPath} to ${outputPath}`);
      
      ffmpeg(inputPath)
        .outputOptions(['-c:s', 'srt'])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`    Conversion command: ${commandLine}`);
        })
        .on('end', () => {
          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            if (stats.size > 0) {
              logger.info(`    ✓ Conversion succeeded (${stats.size} bytes)`);
              resolve(outputPath);
            } else {
              logger.debug(`    ✗ Converted file is empty`);
              fs.unlinkSync(outputPath);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        })
        .on('error', (err, stdout, stderr) => {
          logger.debug(`    ✗ Conversion failed: ${err.message}`);
          if (stderr) {
            const stderrLines = stderr.split('\n');
            logger.debug(`    Conversion stderr (${stderrLines.length} lines):`);
            stderrLines.forEach(line => {
              if (line.trim()) logger.debug(`      ${line}`);
            });
          }
          resolve(null);
        })
        .run();
    } catch (error) {
      logger.debug(`    Exception in conversion: ${error.message}`);
      resolve(null);
    }
  });
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
    try {
      // Log what we're attempting
      const optionsDesc = [];
      if (options.copy) optionsDesc.push('copy');
      if (options.codec) optionsDesc.push(`codec=${options.codec}`);
      if (options.format) optionsDesc.push(`format=${options.format}`);
      if (options.fixSubDuration) optionsDesc.push('fix_sub_duration');
      if (optionsDesc.length === 0) optionsDesc.push('auto-detect');
      logger.info(`    Attempting: ${optionsDesc.join(', ')}`);
      
      // Clean up any existing output file
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          logger.debug(`    Cleaned up existing output file`);
        } catch (err) {
          logger.warn(`    Could not delete existing file: ${err.message}`);
        }
      }
      
      const command = ffmpeg(videoPath);
      
      // Add input options if needed
      const inputOptions = [];
      if (options.fixSubDuration) {
        inputOptions.push('-fix_sub_duration');
      }
      
      if (inputOptions.length > 0) {
        command.inputOptions(inputOptions);
      }
      
      const outputOptions = ['-map', `0:${streamIndex}`];
      
      if (options.copy) {
        outputOptions.push('-c:s', 'copy');
      } else if (options.codec) {
        outputOptions.push('-c:s', options.codec);
      }
      // If neither copy nor codec is specified, let ffmpeg auto-detect
      
      if (options.format) {
        outputOptions.push('-f', options.format);
      }
      
      // Add common options to handle edge cases
      outputOptions.push('-avoid_negative_ts', 'make_zero');
      
      logger.debug(`    Input options: ${JSON.stringify(inputOptions)}`);
      logger.debug(`    Output options: ${JSON.stringify(outputOptions)}`);
      
      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`    FFmpeg command: ${commandLine}`);
        })
        .on('end', () => {
          // Verify the file was created and has content
          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            if (stats.size > 0) {
              logger.info(`    ✓ SUCCESS - Created ${stats.size} byte file`);
              resolve(outputPath);
            } else {
              logger.info(`    ✗ FAILED - File is empty`);
              fs.unlinkSync(outputPath);
              resolve(null);
            }
          } else {
            logger.info(`    ✗ FAILED - File not created`);
            resolve(null);
          }
        })
        .on('error', (err, stdout, stderr) => {
          logger.info(`    ✗ FAILED - ${err.message}`);
          if (stderr) {
            // Show complete stderr for debugging
            const stderrLines = stderr.split('\n');
            logger.debug(`    FFmpeg stderr (${stderrLines.length} lines):`);
            stderrLines.forEach(line => {
              if (line.trim()) logger.debug(`      ${line}`);
            });
          } else {
            logger.debug(`    FFmpeg stderr: none`);
          }
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
    } catch (error) {
      logger.error(`    Exception in tryExtractionMethod: ${error.message}`);
      resolve(null);
    }
  });
}

module.exports = { extractSubtitle };

