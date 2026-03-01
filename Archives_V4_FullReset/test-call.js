require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.BLAND_AI_API_KEY;
const PHONE_TO_CALL = process.env.PHONE_NUMBER_TO_CALL;
const WEBHOOK_URL = process.env.BLAND_AI_WEBHOOK_URL;

async function makeCall() {
    console.log(`🚀 Lancement d'un appel test vers ${PHONE_TO_CALL}...`);

    try {
        const configPath = path.join(__dirname, 'agent-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const mode = config.modes[config.active_mode];

        let prompt = mode.system_prompt_template;
        prompt = prompt.replace('{{identity.name}}', mode.identity.name);
        prompt = prompt.replace('{{identity.role}}', mode.identity.role);
        prompt = prompt.replace('{{identity.tone}}', mode.identity.tone);
        prompt = prompt.replace('{{business_info.name}}', mode.business_info.name);
        prompt = prompt.replace('{{business_info.description}}', mode.business_info.description);

        const response = await axios.post('https://api.bland.ai/v1/calls', {
            phone_number: PHONE_TO_CALL,
            task: prompt,
            model: "enhanced",
            voice: mode.identity.voice_id,
            language: mode.identity.language,
            webhook: WEBHOOK_URL,
            record: true,
            max_duration: 5,
            first_sentence: `Bonjour ! Ici Sophie de chez Rénovation Expert Québec. Comment puis-je vous aider aujourd'hui ?`
        }, {
            headers: { 'authorization': API_KEY }
        });

        console.log('✅ Appel initié ! Call ID:', response.data.call_id);
    } catch (err) {
        console.error('❌ Erreur lors du lancement de l\'appel:', err.response ? err.response.data : err.message);
    }
}

makeCall();
