const fs = require('fs');
const path = require('path');
require('dotenv').config();

const envConfigPath = path.join(__dirname, 'environments.json');
let environments = {};
let activeEnv = 'renovation';

try {
    if (fs.existsSync(envConfigPath)) {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        environments = data.environments;
        activeEnv = data.active_environment || 'renovation';
    }
} catch (err) {
    console.error('Error loading environments.json:', err.message);
}

const config = {
    port: process.env.PORT || 3000,
    voiceProvider: process.env.VOICE_PROVIDER || 'bland', // 'bland' or 'dograh'
    webhookSecret: process.env.BLAND_AI_WEBHOOK_SECRET || 'sophie-secure-2024',
    google: {
        calendarId: process.env.CALENDAR_ID,
        credentials: process.env.GOOGLE_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) : null,
        keyPath: './credentials.json'
    },
    bland: {
        apiKey: process.env.BLAND_AI_API_KEY,
        elevenlabsApiKey: process.env.ELEVENLABS_API_KEY
    },
    dograh: {
        apiKey: process.env.DOGRAH_API_KEY,
        webhookUrl: process.env.DOGRAH_WEBHOOK_URL
    },
    fonoster: {
        project: process.env.FONOSTER_PROJECT,
        token: process.env.FONOSTER_TOKEN,
        fromNumber: process.env.FONOSTER_FROM_NUMBER,
        recipientNumber: process.env.PHONE_NUMBER_TO_CALL
    },
    crm: {
        twentyApiKey: process.env.TWENTY_API_KEY,
        twentyUrl: process.env.TWENTY_API_URL || 'https://api.twenty.com/v1'
    },
    activeEnv: environments[activeEnv] || environments['renovation'],
    getEnvironment: (id) => {
        try {
            const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
            return data.environments[id];
        } catch (err) {
            return environments[id]; // Fallback to initial load if error
        }
    }
};

module.exports = config;
