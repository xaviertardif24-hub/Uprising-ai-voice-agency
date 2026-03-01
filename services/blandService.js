const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { getActivePrompt } = require('./promptService');

const BLAND_API_URL = 'https://api.bland.ai/v1';

/**
 * Updates a Bland AI agent with the current environment's prompt and voice.
 * @param {string} agentId - The ID of the agent to update.
 * @returns {Promise<Object>} - The API response.
 */
const updateAgentForActiveEnv = async (agentId) => {
    const env = config.activeEnv;
    const prompt = getActivePrompt();

    if (!config.bland.apiKey) {
        logger.warn('Bland AI API key missing. Skipping agent update.');
        return null;
    }

    try {
        const response = await axios.post(`${BLAND_API_URL}/agents/${agentId}`, {
            prompt: prompt,
            voice: env.voice_id,
            language: 'fr',
            model: 'enhanced',
            elevenlabs_api_key: config.bland.elevenlabsApiKey,
            interruption_threshold: 150
        }, {
            headers: {
                'authorization': config.bland.apiKey,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Bland AI agent ${agentId} updated for environment: ${env.id}`);
        return response.data;
    } catch (err) {
        logger.error(`Error updating Bland AI agent ${agentId}:`, err.response?.data || err.message);
        throw err;
    }
};

/**
 * Initiates a call via Bland AI for the active environment.
 * @param {string} phoneNumber - The phone number to call.
 * @param {Object} customVars - Additional variables to pass to the call.
 * @returns {Promise<Object>}
 */
const initiateCall = async (phoneNumber, customVars = {}) => {
    const env = config.activeEnv;
    const prompt = getActivePrompt();

    // Determine a dynamic first sentence based on the business name
    const firstSentence = `Bonjour ! Vous êtes bien chez ${env.name}. Comment puis-je vous aider ?`;

    try {
        // Build webhook URL for post-call data
        const webhookBase = process.env.BLAND_AI_WEBHOOK_URL || `http://localhost:${config.port}/webhook/bland-ai`;
        const webhookUrl = webhookBase.includes(env.id) ? webhookBase : `${webhookBase.replace(/\/webhook\/bland-ai.*/, '')}/webhook/bland-ai/${env.id}`;

        const response = await axios.post(`${BLAND_API_URL}/calls`, {
            phone_number: phoneNumber,
            task: prompt,
            voice: env.voice_id,
            language: 'fr',
            model: 'enhanced',
            elevenlabs_api_key: config.bland.elevenlabsApiKey,
            interruption_threshold: 120,
            wait_for_greeting: true,
            first_sentence: firstSentence,
            temperature: 0.8,
            max_duration: 10,
            record: true,
            webhook: webhookUrl,
            analysis_schema: {
                client_name: "string - nom complet du client",
                client_phone: "string - numéro de téléphone",
                client_email: "string - email du client",
                category: "string - type de projet ou service demandé",
                details: "string - résumé détaillé du besoin du client",
                appointment_date: "string - date du rendez-vous au format YYYY-MM-DD",
                appointment_time: "string - heure du rendez-vous au format HH:mm"
            },
            request_data: {
                business_name: env.name,
                environment: env.id,
                ...customVars
            }
        }, {
            headers: {
                'authorization': config.bland.apiKey,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Call initiated for ${phoneNumber} in environment: ${env.id}`);
        return response.data;
    } catch (err) {
        logger.error('Error initiating call:', err.response?.data || err.message);
        throw err;
    }
};

/**
 * Fetches recent calls from Bland AI history.
 * @returns {Promise<Array>}
 */
const listCalls = async () => {
    try {
        if (!config.bland.apiKey) return [];

        const response = await axios.get(`${BLAND_API_URL}/calls`, {
            params: { limit: 50 },
            headers: { 'authorization': config.bland.apiKey }
        });

        return response.data.calls || [];
    } catch (err) {
        logger.error('Error fetching Bland AI calls:', err.response?.data || err.message);
        return [];
    }
};

module.exports = {
    updateAgentForActiveEnv,
    initiateCall,
    listCalls
};
