require('dotenv/config');
const OpenAI = require('openai').OpenAI;
const fs = require('fs');
const path = require('path');

// Constants
const CONFIG = {
  MAX_CHUNK_SIZE: 10000,  // number of characters per chunk
  CHUNK_TOKENS: 4000,     // increased tokens per chunk for better translation
  MAX_TOKENS: 8000,       // maximum tokens for the response
  SLEEP_DELAY: 1000       // delay between requests to avoid throttling
};

// Config state
let STATE = {
  FILENAME: null,
  LANGUAGE: 'English', // Default target language
  // Token tracking
  totalTokensUsed: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Please provide a path to a text file.');
    process.exit(1);
  }

  // Handle --language flag
  if (args.includes('--language')) {
    const languageIndex = args.indexOf('--language');
    if (languageIndex === args.length - 1) {
      console.error('--language requires a value to be specified');
      process.exit(1);
    }
    STATE.LANGUAGE = args[languageIndex + 1];
    // Remove the flag and its value from args
    args.splice(languageIndex, 2);
  }

  // The remaining argument should be the filename
  if (args.length === 0) {
    console.error('Please provide a path to a text file.');
    process.exit(1);
  }
  STATE.FILENAME = args[0];

  // Validate filename
  if (!STATE.FILENAME) {
    console.error('Please provide a path to a text file.');
    process.exit(1);
  }

  // Resolve path relative to current working directory
  STATE.FILENAME = path.resolve(process.cwd(), STATE.FILENAME);
}

// Initialize OpenAI client
const openai = new OpenAI({
  // baseURL: 'https://api.deepseek.com',
  // apiKey: process.env.DEEPSEEK_API_KEY
  apiKey: process.env.OPENAI_API_KEY
});

// const MODEL = process.env.DEEPSEEK_MODEL;
const MODEL = process.env.OPENAI_MODEL;

/**
 * Utility functions
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate output filename
function generateOutputFilename() {
  const dir = path.dirname(STATE.FILENAME);
  const ext = path.extname(STATE.FILENAME);
  const base = path.basename(STATE.FILENAME, ext);
  return path.join(dir, `translated_${base}${ext}`);
}

// Track token usage
function trackTokenUsage(response) {
  STATE.totalTokensUsed.promptTokens += response.usage.prompt_tokens;
  STATE.totalTokensUsed.completionTokens += response.usage.completion_tokens;
  STATE.totalTokensUsed.totalTokens += response.usage.total_tokens;
}

// Display token usage stats
function displayTokenUsage(status = '') {
  console.log(`=== TOTAL TOKEN USAGE SUMMARY ${status ? '(' + status + ')' : ''} ===`);
  console.log(`Prompt tokens: ${STATE.totalTokensUsed.promptTokens.toLocaleString()}`);
  console.log(`Completion tokens: ${STATE.totalTokensUsed.completionTokens.toLocaleString()}`);
  console.log(`Total tokens: ${STATE.totalTokensUsed.totalTokens.toLocaleString()}`);
  console.log(`Estimated cost (at $0.00060 per 1K tokens): ${((STATE.totalTokensUsed.totalTokens / 1000) * 0.00060).toFixed(4)}`);
  console.log('=================================');
}

// Reset token counter
function resetTokenCounter() {
  STATE.totalTokensUsed = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
  console.log('Token counter reset');
}

/**
 * API request handling
 */
async function makeOpenAIRequest(systemPrompt, userContent, maxTokens, requestType, requestInfo = {}) {
  await delay(CONFIG.SLEEP_DELAY);

  const startTime = Date.now();

  console.log(`Sending request to OpenAI: ${requestType}`, requestInfo);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    max_tokens: maxTokens
  });

  const endTime = Date.now();

  // Log token usage
  console.log('OpenAI API request completed:', {
    requestType,
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    totalTokens: response.usage.total_tokens,
    elapsedTime: endTime - startTime + 'ms',
    ...requestInfo
  });

  // Track token usage
  trackTokenUsage(response);

  return response.choices[0].message.content;
}

/**
 * Text processing functions
 */
function splitIntoChunks(text) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= CONFIG.MAX_CHUNK_SIZE) {
      currentChunk += paragraph + '\n\n';
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph + '\n\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // Log chunk sizes for debugging
  console.log('Chunk sizes:');
  chunks.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1}: ${chunk.length} characters`);
  });

  return chunks;
}

async function translateChunk(chunk, chunkIndex, totalChunks) {
  const prompt = `Translate the following text to ${STATE.LANGUAGE}. This is chunk ${chunkIndex + 1} of ${totalChunks}.
IMPORTANT TRANSLATION GUIDELINES:
Only output the translated content, nothing else.

If what you are translating is truncated, leave it truncated. For example:

"770
00:34:36,441 --> 00:34:39,043
- Mais moi, j'ai besoin d'un
petit peu plus de tendresse

771
00:34:39,110 --> 00:34:40,044
au début."

Should be translated as:
"770
00:34:36,441 --> 00:34:39,043
- I need a
little more tenderness

771
00:34:39,110 --> 00:34:40,044
at the beginning."

Preserve any special characters or formatting, including timestamps and sequence numbers.
Maintain the original structure and formatting. DO NOT SKIP ANY PARAGRAPHS OR LINES.
If you have no translation or if the input is not translatable, return the original text as output. For example

"284
00:13:40,019 --> 00:13:41,820
- Oh, j'avance de six!
- Oui!

285
00:13:41,887 --> 00:13:44,890
(♪ iodle ♪)

286
00:13:51,397 --> 00:13:53,332
- Un autre article!

287
00:13:53,399 --> 00:13:55,000
- Euh, une boîte
de Hamburger Helper!

288
00:13:55,067 --> 00:13:57,236
- 5$!
- 2$!"

Should be translated as:

"284
00:13:40,019 --> 00:13:41,820
- Oh, j'avance de six!
- Oui!

285
00:13:41,887 --> 00:13:44,890
(♪ iodle ♪)

286
00:13:51,397 --> 00:13:53,332
- Another article!

287
00:13:53,399 --> 00:13:55,000
- Uh, a box
of Hamburger Helper!

288
00:13:55,067 --> 00:13:57,236
- 5$!
- 2$!"

Keep the original tone and style.
DO NOT include any meta-commentary or disclaimers.
DO NOT start with phrases like "Here is the translation".
Your entire response should only be only the translated content.
Ensure you translate ALL content provided.
Do not skip or omit any part of the text.
If the text is too long, translate it completely without truncation.
Maintain all paragraphs and line breaks exactly as in the original.
In no case should you change any numbers or timestamps.
Every number and timestamp from the original text should be in your output.
Original text to translate:
`;

  const translatedContent = await makeOpenAIRequest(
    prompt,
    chunk,
    CONFIG.MAX_TOKENS,  // Use MAX_TOKENS instead of CHUNK_TOKENS
    'translateChunk',
    { chunk: `${chunkIndex + 1}/${totalChunks}` }
  );

  // Log chunk translation completion
  console.log(`Completed translation of chunk ${chunkIndex + 1}/${totalChunks}`);
  console.log(`Original chunk size: ${chunk.length} characters`);
  console.log(`Translated chunk size: ${translatedContent.length} characters`);

  // Verify the translation is complete
  if (translatedContent.length < chunk.length * 0.5) { // Basic check for incomplete translation
    console.warn(`Warning: Translated chunk ${chunkIndex + 1} is significantly shorter than the original`);
  }

  return translatedContent;
}

/**
 * Main translation function
 */
async function translateText() {
  try {
    const startTime = Date.now();
    const filePath = STATE.FILENAME;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at: ${filePath}`);
    }

    // Generate output file path and clear it if it exists
    const outputFilePath = generateOutputFilename();
    if (fs.existsSync(outputFilePath)) {
      console.log(`Clearing existing output file: ${outputFilePath}`);
      fs.writeFileSync(outputFilePath, ''); // Empty the file
    }

    console.log(`Starting translation of text file: ${filePath} to ${STATE.LANGUAGE}`);

    // Read the input file
    const text = fs.readFileSync(filePath, 'utf8');
    console.log(`Read ${text.length} characters from input file`);

    // Split into chunks
    const chunks = splitIntoChunks(text);
    console.log(`Split text into ${chunks.length} chunks`);

    // Translate each chunk
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\nProcessing chunk ${i + 1}/${chunks.length}`);
      const translatedChunk = await translateChunk(chunks[i], i, chunks.length);
      
      // Verify the translated chunk is not empty
      if (!translatedChunk || translatedChunk.trim().length === 0) {
        throw new Error(`Translation failed for chunk ${i + 1}: Empty response received`);
      }
      
      translatedChunks.push(translatedChunk);
    }

    // Log final chunk count verification
    console.log(`\nVerifying chunk counts:`);
    console.log(`Original chunks: ${chunks.length}`);
    console.log(`Translated chunks: ${translatedChunks.length}`);

    if (chunks.length !== translatedChunks.length) {
      throw new Error(`Mismatch in chunk counts: Original=${chunks.length}, Translated=${translatedChunks.length}`);
    }

    // Combine translated chunks with proper spacing
    const fullTranslation = translatedChunks.join('\n\n');

    // Verify final translation size
    console.log(`\nFinal translation size: ${fullTranslation.length} characters`);
    console.log(`Original text size: ${text.length} characters`);
    console.log(`Translation ratio: ${(fullTranslation.length / text.length * 100).toFixed(2)}%`);

    // Write to output file
    fs.writeFileSync(outputFilePath, fullTranslation);
    console.log(`\nTranslation written to file: ${outputFilePath}`);

    const endTime = Date.now();
    console.log('Total elapsed time for translation:', endTime - startTime, 'ms');

    displayTokenUsage();

    return fullTranslation;
  } catch (error) {
    console.error('Error during translation:', error);
    displayTokenUsage('INCOMPLETE');
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  parseArgs();
  resetTokenCounter();

  try {
    await translateText();
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

// Start execution
main();
