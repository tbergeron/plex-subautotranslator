/**
 * Logger utility with different log levels
 * Logs to both console and file
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

// Setup log directory and file
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Create logs directory if it doesn't exist
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data !== undefined) {
    return `${prefix} ${message} ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
  }
  
  return `${prefix} ${message}`;
}

/**
 * Write log message to file
 */
function writeToFile(formattedMessage) {
  try {
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n', 'utf8');
  } catch (error) {
    // If file logging fails, at least log to console
    console.error('Failed to write to log file:', error.message);
  }
}

/**
 * Log a message to both console and file
 */
function log(level, consoleMethod, message, data) {
  if (currentLogLevel >= LOG_LEVELS[level]) {
    const formattedMessage = formatMessage(level, message, data);
    
    // Write to console
    consoleMethod(formattedMessage);
    
    // Write to file
    writeToFile(formattedMessage);
  }
}

const logger = {
  error: (message, data) => {
    log('error', console.error, message, data);
  },
  
  warn: (message, data) => {
    log('warn', console.warn, message, data);
  },
  
  info: (message, data) => {
    log('info', console.log, message, data);
  },
  
  debug: (message, data) => {
    log('debug', console.log, message, data);
  }
};

module.exports = { logger };

