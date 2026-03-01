const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { getActivePrompt } = require('./promptService');

const DOGRAH_API_URL = 'https://api.dograh.ai/v1'; // Assuming base URL

/**
 * Initiates an outbound session or configures an agent on Dograh
 * @param {string} phoneNumber 
 * @param {Object} customVars 
 */
const initiateDograhCall = async (phoneNumber, customVars = {}) => {
    const env = config.activeEnv;
    const prompt = getActivePrompt();

    if (!config.dograh.apiKey) {
        logger.warn('Dograh API key missing. Skipping.');
        return null;
    }

    try {
        const response = await axios.post(`${DOGRAH_API_URL}/sessions`, {
            recipient: phoneNumber,
            prompt: prompt,
            voice: env.voice_id || 'default',
            language: 'fr',
            provider: 'fonoster', // Migrated from twilio
            webhook_url: config.dograh.webhookUrl,
            metadata: {
                business_name: env.name,
                environment: env.id,
                ...customVars
            }
        }, {
            headers: {
                'Authorization': `Bearer ${config.dograh.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Dograh session initiated for ${phoneNumber}`);
        return response.data;
    } catch (err) {
        logger.error('Error initiating Dograh call:', err.response?.data || err.message);
        throw err;
    }
};

module.exports = { initiateDograhCall };
