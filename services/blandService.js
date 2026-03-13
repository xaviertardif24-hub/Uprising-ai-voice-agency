const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { getActivePrompt } = require('./promptService');

const BLAND_API_URL = 'https://api.bland.ai/v1';

/**
 * Determines if a voice ID is an ElevenLabs voice.
 * Uses explicit voice_provider field first, then falls back to length heuristic.
 * @param {Object} env
 * @returns {boolean}
 */
const isElevenLabsVoice = (env) => {
    if (env.voice_provider) {
        return env.voice_provider === 'elevenlabs';
    }
    // Fallback heuristic: ElevenLabs IDs are long alphanumeric strings (>10 chars)
    return !!(env.voice_id && env.voice_id.length > 10);
};

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
            interruption_threshold: env.interruption_threshold || 300
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

    const firstSentence = env.first_sentence || `Bonjour, ${env.name}, comment puis-je vous aider ?`;

    try {
        const webhookBase = process.env.BLAND_AI_WEBHOOK_URL || `http://localhost:${config.port}/webhook/bland-ai`;
        const webhookUrl = webhookBase.includes(env.id)
            ? webhookBase
            : `${webhookBase.replace(/\/webhook\/bland-ai.*/, '')}/webhook/bland-ai/${env.id}`;

        // ✅ Use explicit voice_provider field for reliable detection
        const useElevenLabs = isElevenLabsVoice(env);
        const hasElevenLabsKey = !!config.bland.elevenlabsApiKey;

        const callBody = {
            phone_number: phoneNumber,
            task: prompt,
            voice: env.voice_id || 'maya',
            language: 'fr',
            model: 'enhanced',
            interruption_threshold: env.interruption_threshold || 300,
            wait_for_greeting: true,
            first_sentence: firstSentence,
            temperature: 0.88,
            max_duration: 15,
            record: true,
            webhook: webhookUrl,
            analysis_schema: {
                client_name: "string - prénom et nom complet du client",
                client_phone: "string - numéro de téléphone avec indicatif",
                client_email: "string - adresse email du client",
                category: "string - type de projet ou service demandé",
                details: "string - résumé détaillé du besoin et contexte du client",
                appointment_date: "string - date du rendez-vous au format YYYY-MM-DD",
                appointment_time: "string - heure du rendez-vous au format HH:mm",
                call_outcome: "string - résultat de l'appel: appointment_booked, callback_requested, not_interested, incomplete",
                quality_flags: "string - problèmes détectés: bad_audio, client_frustrated, incomplete_info, or none"
            },
            request_data: {
                business_name: env.name,
                environment: env.id,
                ...customVars
            }
        };

        if (useElevenLabs && hasElevenLabsKey) {
            callBody.elevenlabs_api_key = config.bland.elevenlabsApiKey;
        }

        let response;
        try {
            response = await axios.post(`${BLAND_API_URL}/calls`, callBody, {
                headers: { 'authorization': config.bland.apiKey, 'Content-Type': 'application/json' }
            });

            if (response.data?.status === 'error') {
                throw new Error(response.data.message || 'Bland AI returned an error');
            }
        } catch (voiceErr) {
            // If ElevenLabs voice failed, retry with native Bland AI French-compatible voice
            if (useElevenLabs) {
                logger.warn(`ElevenLabs voice failed (${voiceErr.response?.data?.message || voiceErr.message}). Retrying with native voice 'maya'...`);
                const fallbackBody = { ...callBody, voice: 'maya' };
                delete fallbackBody.elevenlabs_api_key;
                response = await axios.post(`${BLAND_API_URL}/calls`, fallbackBody, {
                    headers: { 'authorization': config.bland.apiKey, 'Content-Type': 'application/json' }
                });
            } else {
                throw voiceErr;
            }
        }

        logger.info(`✅ Call initiated for ${phoneNumber} in environment: ${env.id}`);
        return response.data;
    } catch (err) {
        const errDetail = err.response?.data || err.message;
        logger.error('Error initiating call:', JSON.stringify(errDetail));
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
