const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const { google } = require('googleapis');

async function testConnections() {
    console.log('🚀 Starting Live Connection Test...\n');

    // 1. Test Bland AI
    console.log('--- Bland AI ---');
    if (!config.bland.apiKey) {
        console.error('❌ BLAND_API_KEY is missing');
    } else {
        try {
            const res = await axios.get('https://api.bland.ai/v1/agents', {
                headers: { authorization: config.bland.apiKey }
            });
            console.log('✅ Connection Successful (Bland AI)');
            console.log(`📡 Found ${res.data.agents?.length || 0} agents`);
        } catch (err) {
            console.error('❌ Bland AI Connection Failed:', err.response?.data || err.message);
        }
    }

    // 2. Test Google Calendar
    console.log('\n--- Google Calendar ---');
    try {
        const credentialsPath = path.resolve(__dirname, 'credentials.json');
        if (!fs.existsSync(credentialsPath)) {
            console.error('❌ credentials.json is missing');
        } else {
            const auth = new google.auth.GoogleAuth({
                keyFile: credentialsPath,
                scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
            });
            const client = await auth.getClient();
            const calendar = google.calendar({ version: 'v3', auth: client });
            
            // Just try to list a few events to verify auth
            const res = await calendar.events.list({
                calendarId: config.google.calendarId || 'primary',
                maxResults: 1
            });
            console.log('✅ Connection Successful (Google Calendar)');
            console.log(`📅 Calendar ID: ${config.google.calendarId || 'primary'}`);
        }
    } catch (err) {
        console.error('❌ Google Calendar Connection Failed:', err.message);
    }

    // 3. Test SMTP (Optional but good)
    console.log('\n--- SMTP/Email ---');
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log('✅ SMTP Credentials present');
    } else {
        console.warn('⚠️ SMTP Credentials missing');
    }

    console.log('\n🏁 Test finished.');
}

testConnections();
