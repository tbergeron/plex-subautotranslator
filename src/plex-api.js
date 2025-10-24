const axios = require('axios');
const { logger } = require('./logger');

const PLEX_CONFIG = {
  serverUrl: process.env.PLEX_SERVER_URL || 'http://localhost:32400',
  token: process.env.PLEX_TOKEN
};

/**
 * Refresh a specific Plex library section
 * @param {string|number} sectionId - The library section ID
 * @returns {Promise<boolean>} - True if refresh was triggered successfully
 */
async function refreshPlexLibrary(sectionId) {
  try {
    if (!PLEX_CONFIG.token) {
      logger.warn('Plex token not configured, skipping library refresh');
      return false;
    }

    const url = `${PLEX_CONFIG.serverUrl}/library/sections/${sectionId}/refresh`;
    
    logger.info(`Triggering Plex library refresh for section ${sectionId}`);
    logger.debug(`Request URL: ${url}`);

    const response = await axios.get(url, {
      params: {
        'X-Plex-Token': PLEX_CONFIG.token
      },
      timeout: 5000
    });

    if (response.status === 200) {
      logger.info('Plex library refresh triggered successfully');
      return true;
    } else {
      logger.warn(`Unexpected response status from Plex: ${response.status}`);
      return false;
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logger.error('Could not connect to Plex server - is it running?');
    } else if (error.response) {
      logger.error(`Plex API error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      logger.error('Error refreshing Plex library:', error.message);
    }
    return false;
  }
}

/**
 * Test connection to Plex server
 * @returns {Promise<boolean>} - True if connection is successful
 */
async function testPlexConnection() {
  try {
    if (!PLEX_CONFIG.token) {
      logger.warn('Plex token not configured');
      return false;
    }

    const url = `${PLEX_CONFIG.serverUrl}/`;
    
    const response = await axios.get(url, {
      params: {
        'X-Plex-Token': PLEX_CONFIG.token
      },
      timeout: 5000
    });

    if (response.status === 200) {
      logger.info('Successfully connected to Plex server');
      return true;
    }
    
    return false;

  } catch (error) {
    logger.error('Failed to connect to Plex server:', error.message);
    return false;
  }
}

module.exports = {
  refreshPlexLibrary,
  testPlexConnection
};

