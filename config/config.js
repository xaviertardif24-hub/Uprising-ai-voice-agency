const fs = require('fs');
const path = require('path');
require('dotenv').config();

const envConfigPath = path.join(__dirname, 'environments.json');

// ─── ENVIRONMENTS CACHE ───────────────────────────────────────────────────────
let _envCache = null;
let _envCacheTime = 0;
const ENV_CACHE_TTL = 5000; // 5 seconds TTL

const loadEnvironments = () => {
    const now = Date.now();
    if (_envCache && (now - _envCacheTime) < ENV_CACHE_TTL) {
        return _envCache;
    }
    try {
        if (fs.existsSync(envConfigPath)) {
            _envCache = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
            _envCacheTime = now;
            return _envCache;
        }
    } catch (err) {
        console.error('Error loading environments.json:', err.message);
    }
    return _envCache || { environments: {}, active_environment: 'renovation' };
};

const invalidateCache = () => {
    _envCache = null;
    _envCacheTime = 0;
};

// Initial load
const initialData = loadEnvironments();
let activeEnvId = initialData.active_environment || 'renovation';

// ─── SECURITY CHECK ───────────────────────────────────────────────────────────
if (!process.env.BLAND_AI_WEBHOOK_SECRET) {
    console.warn('[⚠️ SECURITY] BLAND_AI_WEBHOOK_SECRET is not set in .env. Webhook endpoints are unprotected!');
}

const config = {
    port: process.env.PORT || 3000,
    voiceProvider: process.env.VOICE_PROVIDER || 'bland',
    // No default secret — must be explicitly set via env var
    webhookSecret: process.env.BLAND_AI_WEBHOOK_SECRET || null,
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
    get activeEnv() {
        const data = loadEnvironments();
        return data.environments[activeEnvId] || data.environments[Object.keys(data.environments)[0]];
    },
    set activeEnv(env) {
        activeEnvId = env.id;
    },
    getEnvironment: (id) => {
        const data = loadEnvironments();
        return data.environments[id] || null;
    },
    invalidateCache
};

module.exports = config;
