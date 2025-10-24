/**
 * Simple logger utility with different log levels
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data !== undefined) {
    return `${prefix} ${message} ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
  }
  
  return `${prefix} ${message}`;
}

const logger = {
  error: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, data));
    }
  },
  
  warn: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, data));
    }
  },
  
  info: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, data));
    }
  },
  
  debug: (message, data) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message, data));
    }
  }
};

module.exports = { logger };

