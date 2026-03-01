const { initiateCall } = require('./services/blandService');
const config = require('./config/config');
const logger = require('./utils/logger');

const runTestCall = async () => {
    const targetNumber = config.twilio.recipientNumber; // Uses PHONE_NUMBER_TO_CALL from .env

    if (!targetNumber) {
        logger.error('❌ Aucun numéro de téléphone trouvé dans PHONE_NUMBER_TO_CALL (.env)');
        return;
    }

    console.log(`🚀 Lancement d'un appel via Bland AI...`);
    console.log(`🏢 Environnement : ${config.activeEnv.name}`);
    console.log(`📞 Appel vers : ${targetNumber}`);
    console.log(`🗣️ Voix utilisée : ${config.activeEnv.id} (${config.activeEnv.voice_id})`);

    try {
        const result = await initiateCall(targetNumber, {
            test_mode: true,
            notes: "Appel de test pour vérification de l'environnement"
        });
        console.log('✅ Appel initié avec succès !');
        console.log('ID de l\'appel :', result.call_id);
    } catch (err) {
        console.error('❌ Échec de l\'appel.');
    }
};

runTestCall();
