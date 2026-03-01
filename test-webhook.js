const axios = require('axios');

const testWebhook = async () => {
    const payload = {
        to: "+14388679020",
        phone_number: "+14388679020",
        variables: {
            client_name: "Jean Dupont",
            nom: "Jean Dupont",
            category: "Estimation Toiture",
            projet: "Estimation Toiture",
            details: "Besoin de réparer une fuite sur le toit.",
            informations: "Besoin de réparer une fuite sur le toit.",
            appointment_date: "2026-03-15",
            preferred_date: "2026-03-15",
            appointment_time: "14:30",
            preferred_time: "14:30"
        }
    };

    try {
        console.log('🚀 Sending test webhook payload to http://localhost:3000/webhook/bland-ai...');
        const response = await axios.post('http://localhost:3000/webhook/bland-ai', payload);
        console.log('✅ Response:', response.data);
    } catch (err) {
        console.error('❌ Error sending webhook:', err.response ? err.response.data : err.message);
    }
};

testWebhook();
