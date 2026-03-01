const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { getActivePrompt, renderPrompt } = require('./promptService');

/**
 * Handles an inbound call received via Bland AI webhook.
 * Bland AI forwards inbound calls to your webhook — this processes the data.
 * @param {Object} callData - Raw data from Bland AI inbound webhook
 * @param {string} agentId - Optional agent ID for routing
 * @returns {Object} Processed call info
 */
const processInboundCall = (callData, agentId) => {
    const env = agentId ? config.getEnvironment(agentId) : config.activeEnv;

    return {
        direction: 'inbound',
        callId: callData.call_id || callData.id || `inb_${Date.now()}`,
        from: callData.from || callData.caller_number || callData.phone_number || 'Unknown',
        to: callData.to || callData.called_number || 'N/A',
        status: callData.status || 'received',
        duration: callData.call_length || callData.duration || 0,
        timestamp: new Date().toISOString(),
        agentId: agentId || config.activeEnv?.id || 'default',
        businessName: env?.name || 'Uprising AI',
        summary: callData.summary || callData.concatenated_transcript || '',
        transcript: callData.concatenated_transcript || callData.transcript || '',
        recording_url: callData.recording_url || null,
        variables: callData.variables || {}
    };
};

/**
 * Registers a phone number with Bland AI for inbound call handling.
 * This sets up the AI agent to answer calls on a specific number.
 * @param {string} phoneNumber - The phone number to register
 * @param {string} agentId - The agent configuration to use
 * @returns {Promise<Object>}
 */
const registerInboundNumber = async (phoneNumber, agentId) => {
    if (!config.bland.apiKey) {
        logger.warn('Bland AI API key missing. Cannot register inbound number.');
        return null;
    }

    const env = agentId ? config.getEnvironment(agentId) : config.activeEnv;
    const prompt = agentId
        ? renderPrompt(env.prompt_template, env)
        : getActivePrompt();

    const webhookBase = process.env.BLAND_AI_WEBHOOK_URL || `http://localhost:${config.port}`;
    const webhookUrl = `${webhookBase.replace('/webhook/bland-ai', '')}/webhook/bland-ai-inbound/${agentId || env?.id || 'default'}`;

    try {
        const response = await axios.post('https://api.bland.ai/v1/inbound', {
            phone_number: phoneNumber,
            prompt: prompt,
            voice: env?.voice_id || 'default',
            language: 'fr',
            model: 'enhanced',
            webhook: webhookUrl,
            first_sentence: `Bonjour ! Vous êtes bien chez ${env?.name || 'Uprising AI'}. Comment puis-je vous aider ?`,
            interruption_threshold: 120,
            max_duration: 15,
            record: true,
            temperature: 0.8
        }, {
            headers: {
                'authorization': config.bland.apiKey,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Inbound number ${phoneNumber} registered for agent: ${agentId || 'default'}`);
        return response.data;
    } catch (err) {
        logger.error('Error registering inbound number:', err.response?.data || err.message);
        throw err;
    }
};

/**
 * Lists all registered inbound numbers from Bland AI
 * @returns {Promise<Array>}
 */
const listInboundNumbers = async () => {
    if (!config.bland.apiKey) return [];

    try {
        const response = await axios.get('https://api.bland.ai/v1/inbound', {
            headers: { 'authorization': config.bland.apiKey }
        });
        return response.data?.inbound_numbers || response.data || [];
    } catch (err) {
        logger.error('Error listing inbound numbers:', err.response?.data || err.message);
        return [];
    }
};

module.exports = {
    processInboundCall,
    registerInboundNumber,
    listInboundNumbers
};
