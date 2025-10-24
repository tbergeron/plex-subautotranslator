const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Configuration from environment
const CONFIG = {
  MAX_CHUNK_SIZE: parseInt(process.env.MAX_CHUNK_SIZE) || 10000,
  MAX_TOKENS: parseInt(process.env.MAX_TOKENS) || 8000,
  SLEEP_DELAY: 1000
};

// Token tracking
const tokenStats = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};

/**
 * Utility function to add delay between API requests
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Track token usage from API response
 */
function trackTokenUsage(response) {
  if (response.usage) {
    tokenStats.promptTokens += response.usage.prompt_tokens;
    tokenStats.completionTokens += response.usage.completion_tokens;
    tokenStats.totalTokens += response.usage.total_tokens;
  }
}

/**
 * Display token usage statistics
 */
function displayTokenUsage() {
  logger.info('=== TOKEN USAGE SUMMARY ===');
  logger.info(`Prompt tokens: ${tokenStats.promptTokens.toLocaleString()}`);
  logger.info(`Completion tokens: ${tokenStats.completionTokens.toLocaleString()}`);
  logger.info(`Total tokens: ${tokenStats.totalTokens.toLocaleString()}`);
  logger.info(`Estimated cost (at $0.00015 per 1K input, $0.0006 per 1K output): $${calculateCost()}`);
  logger.info('===========================');
}

/**
 * Calculate approximate cost for GPT-4o-mini
 */
function calculateCost() {
  const inputCost = (tokenStats.promptTokens / 1000) * 0.00015;
  const outputCost = (tokenStats.completionTokens / 1000) * 0.0006;
  return (inputCost + outputCost).toFixed(4);
}

/**
 * Reset token counter
 */
function resetTokenCounter() {
  tokenStats.promptTokens = 0;
  tokenStats.completionTokens = 0;
  tokenStats.totalTokens = 0;
}

/**
 * Split SRT content into manageable chunks
 * Tries to split at subtitle boundaries to maintain structure
 */
function splitIntoChunks(srtContent) {
  const chunks = [];
  
  // Split by subtitle entries (separated by blank lines)
  const entries = srtContent.split(/\n\n+/);
  let currentChunk = '';

  for (const entry of entries) {
    const entryWithBreak = entry + '\n\n';
    
    // If adding this entry would exceed chunk size, save current chunk
    if ((currentChunk + entryWithBreak).length > CONFIG.MAX_CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = entryWithBreak;
    } else {
      currentChunk += entryWithBreak;
    }
  }

  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  logger.info(`Split subtitle into ${chunks.length} chunk(s)`);
  chunks.forEach((chunk, index) => {
    logger.debug(`Chunk ${index + 1}: ${chunk.length} characters`);
  });

  return chunks;
}

/**
 * Translate a single chunk using OpenAI
 */
async function translateChunk(chunk, chunkIndex, totalChunks, targetLang) {
  await delay(CONFIG.SLEEP_DELAY);

  const startTime = Date.now();

  const systemPrompt = `You are a professional subtitle translator. Translate the following SRT subtitle content to ${targetLang}.

CRITICAL RULES:
1. Preserve ALL timestamps exactly as they appear (format: HH:MM:SS,mmm --> HH:MM:SS,mmm)
2. Preserve ALL sequence numbers
3. Maintain the exact SRT format structure
4. Translate ONLY the text content, not numbers or timestamps
5. If text is truncated mid-sentence due to chunking, keep it truncated in translation
6. Preserve special characters, formatting markers (like ♪), and speaker labels (like "- ")
7. Output ONLY the translated subtitle content with no meta-commentary
8. Do NOT add phrases like "Here is the translation"
9. Maintain line breaks within each subtitle entry
10. Keep all blank lines between entries

This is chunk ${chunkIndex + 1} of ${totalChunks}.`;

  const userContent = `Translate this SRT subtitle content:\n\n${chunk}`;

  try {
    logger.info(`Translating chunk ${chunkIndex + 1}/${totalChunks}...`);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: CONFIG.MAX_TOKENS,
      temperature: 0.3  // Lower temperature for more consistent translations
    });

    const translatedContent = response.choices[0].message.content;
    const endTime = Date.now();

    // Track token usage
    trackTokenUsage(response);

    logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} completed in ${endTime - startTime}ms`);
    logger.debug(`Tokens used: ${response.usage.total_tokens}`);
    logger.debug(`Original size: ${chunk.length} characters`);
    logger.debug(`Translated size: ${translatedContent.length} characters`);

    // Basic validation
    if (!translatedContent || translatedContent.trim().length === 0) {
      throw new Error('Empty translation received from OpenAI');
    }

    // Warn if translation is significantly shorter (might indicate incomplete translation)
    if (translatedContent.length < chunk.length * 0.3) {
      logger.warn(`Translation seems unusually short for chunk ${chunkIndex + 1}`);
    }

    return translatedContent;

  } catch (error) {
    logger.error(`Error translating chunk ${chunkIndex + 1}:`, error.message);
    throw error;
  }
}

/**
 * Translate an entire subtitle file
 * @param {string} srtPath - Path to the extracted SRT file
 * @param {string} videoPath - Path to the original video file
 * @param {string} targetLang - Target language for translation
 * @returns {Promise<string>} - Path to the translated subtitle file
 */
async function translateSubtitle(srtPath, videoPath, targetLang) {
  const startTime = Date.now();
  resetTokenCounter();

  try {
    logger.info('=== Starting subtitle translation ===');
    logger.info(`Source SRT: ${srtPath}`);
    logger.info(`Target language: ${targetLang}`);

    // Read the SRT file
    if (!fs.existsSync(srtPath)) {
      throw new Error(`SRT file not found: ${srtPath}`);
    }

    const srtContent = fs.readFileSync(srtPath, 'utf8');
    logger.info(`Read ${srtContent.length} characters from SRT file`);

    // Generate output path based on video file
    const dir = path.dirname(videoPath);
    const ext = path.extname(videoPath);
    const base = path.basename(videoPath, ext);
    const langCode = targetLang.toLowerCase().substring(0, 2); // e.g., "en" from "English"
    const outputPath = path.join(dir, `${base}.${langCode}.srt`);

    // Split into chunks if necessary
    const chunks = splitIntoChunks(srtContent);

    // Translate each chunk
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const translatedChunk = await translateChunk(chunks[i], i, chunks.length, targetLang);
      translatedChunks.push(translatedChunk);
    }

    // Verify chunk counts
    if (chunks.length !== translatedChunks.length) {
      throw new Error(`Chunk count mismatch: ${chunks.length} original vs ${translatedChunks.length} translated`);
    }

    // Combine translated chunks
    const fullTranslation = translatedChunks.join('\n\n');

    // Write the translated subtitle file
    fs.writeFileSync(outputPath, fullTranslation, 'utf8');
    logger.info(`Translated subtitle written to: ${outputPath}`);

    // Clean up the extracted subtitle file
    try {
      fs.unlinkSync(srtPath);
      logger.debug(`Cleaned up extracted file: ${srtPath}`);
    } catch (cleanupError) {
      logger.warn(`Could not delete extracted file: ${cleanupError.message}`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    logger.info('=== Translation complete ===');
    logger.info(`Duration: ${duration}s`);
    displayTokenUsage();

    return outputPath;

  } catch (error) {
    logger.error('Error during subtitle translation:', error);
    displayTokenUsage();
    throw error;
  }
}

module.exports = { translateSubtitle };

