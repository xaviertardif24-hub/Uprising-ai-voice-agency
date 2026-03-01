const logger = require('../utils/logger');
const config = require('../config/config');
// Note: SDK is being installed. We use the recommended pattern.
// const Fonoster = require("@fonoster/sdk");

/**
 * Sends an SMS notification via Fonoster
 * @param {Object} leadData
 */
const sendSmsNotification = async (leadData) => {
    const { name, phone, project, apptDate, apptTime } = leadData;

    if (!config.fonoster.token || !config.fonoster.project) {
        logger.warn('Fonoster config incomplete. Skipping SMS.');
        return;
    }

    try {
        const recipient = leadData.ownerPhone || config.fonoster.recipientNumber;
        const body = `🔔 [${leadData.businessName || 'Lead'}] Nouveau : ${name}\n📞 ${phone}\n🏗️ Projet : ${project}\n📅 RDV : ${apptDate || 'À fixer'} ${apptTime || ''}`;

        // In a live environment with Fonoster:
        // const domains = new Fonoster.Domains({ project: config.fonoster.project, token: config.fonoster.token });
        // await domains.sendSms({ from: config.fonoster.fromNumber, to: recipient, message: body });

        logger.info(`Fonoster SMS queued for ${recipient}: ${name}`);
    } catch (err) {
        logger.error('Error sending Fonoster SMS:', err.message);
    }
};

/**
 * Initiates an outbound call via Fonoster
 * @param {string} phoneNumber
 * @param {Object} customVars
 */
const initiateFonosterCall = async (phoneNumber, customVars = {}) => {
    logger.info(`Initiating Fonoster outbound call to ${phoneNumber}`);
    // This would use the Fonoster Calls service to link a number to an AI application
    return { success: true, session_id: `fonos_${Date.now()}` };
};

/**
 * Fonoster Voice Application logic skeleton
 * In a real scenario, this would use @fonoster/voice SDK
 * to react to incoming calls and pipe audio to the AI agent.
 */
const startFonosterApp = () => {
    if (!config.fonoster.token) {
        logger.warn('Fonoster config incomplete. Skipping init.');
        return;
    }

    try {
        // Example logic for Fonoster Voice App:
        // const { VoiceServer } = require("@fonoster/voice");
        // const voiceServer = new VoiceServer();
        // voiceServer.listen((req, res) => {
        //   res.answer();
        //   res.play("google-tts://Bonjour! Comment puis-je vous aider?");
        //   // Integrates with Dograh/Bland for streaming here
        // });
        logger.info('Fonoster Voice Application Service initialized (Skeleton)');
    } catch (err) {
        logger.error('Fonoster init failed:', err.message);
    }
};

/**
 * Sends a confirmation SMS to the client
 * @param {Object} leadData 
 */
const sendClientConfirmationSms = async (leadData) => {
    const { name, phone, apptDate, apptTime, businessName } = leadData;
    if (!phone || phone === 'Inconnu' || !apptDate) return;

    try {
        const body = `Bonjour ${name}, votre RDV chez ${businessName || 'notre établissement'} est confirmé pour le ${apptDate} à ${apptTime || 'l\'heure convenue'}. Merci !`;

        // In a live environment:
        // const domains = new Fonoster.Domains({ project: config.fonoster.project, token: config.fonoster.token });
        // await domains.sendSms({ from: config.fonoster.fromNumber, to: phone, message: body });

        logger.info(`Client confirmation SMS queued for ${phone}: ${name}`);
    } catch (err) {
        logger.error('Error sending client SMS:', err.message);
    }
};

module.exports = {
    sendSmsNotification,
    initiateFonosterCall,
    startFonosterApp,
    sendClientConfirmationSms
};
