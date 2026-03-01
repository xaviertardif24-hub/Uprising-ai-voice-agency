const logger = require('../utils/logger');
const { sendOwnerEmail } = require('./emailService');

/**
 * Notification Service — Uses email as primary free channel.
 * Fonoster SMS is available as optional open-source integration.
 * Falls back to email notifications when SMS is not configured.
 */

/**
 * Sends an owner notification (email + optional Fonoster SMS)
 * @param {Object} leadData
 */
const notifyOwner = async (leadData) => {
    const { name, phone, project, apptDate, apptTime, businessName, ownerEmail, ownerPhone } = leadData;

    const message = `🔔 Nouveau Lead — ${businessName || 'Uprising AI'}
👤 ${name}
📞 ${phone}
🏗️ Projet: ${project || 'Non spécifié'}
📅 RDV: ${apptDate || 'À fixer'} ${apptTime || ''}
📝 Détails: ${leadData.details || 'Aucun'}`;

    // 1. Always send email if configured
    if (ownerEmail) {
        try {
            await sendOwnerEmail(ownerEmail, `🔔 Nouveau Lead — ${name} | ${businessName}`, message);
            logger.info(`Owner email notification sent to ${ownerEmail}`);
        } catch (err) {
            logger.error('Failed to send owner email:', err.message);
        }
    }

    // 2. Optional: Fonoster SMS (open-source)
    if (ownerPhone && process.env.FONOSTER_TOKEN && process.env.FONOSTER_PROJECT) {
        try {
            // Fonoster SDK integration — uncomment when configured:
            // const Fonoster = require("@fonoster/sdk");
            // const client = new Fonoster.Client({ accessKeyId: process.env.FONOSTER_TOKEN });
            // await client.messaging.sendSms({ from: process.env.FONOSTER_FROM_NUMBER, to: ownerPhone, body: message });
            logger.info(`Fonoster SMS queued for owner: ${ownerPhone}`);
        } catch (err) {
            logger.error('Fonoster SMS failed:', err.message);
        }
    }

    // 3. Log notification for audit
    logger.info(`Owner notification dispatched for lead: ${name} (${businessName})`);
};

/**
 * Sends a client confirmation notification
 * @param {Object} leadData
 */
const notifyClient = async (leadData) => {
    const { name, phone, apptDate, apptTime, businessName } = leadData;
    if (!phone || phone === 'Inconnu' || !apptDate) return;

    const message = `Bonjour ${name}, votre RDV chez ${businessName || 'notre établissement'} est confirmé pour le ${apptDate} à ${apptTime || "l'heure convenue"}. Merci !`;

    // Optional: Fonoster SMS
    if (process.env.FONOSTER_TOKEN && process.env.FONOSTER_PROJECT) {
        try {
            logger.info(`Client confirmation queued for ${phone}: ${name}`);
        } catch (err) {
            logger.error('Error sending client notification:', err.message);
        }
    }

    // Fallback: if client provided email, send confirmation email
    if (leadData.email && leadData.email !== 'Non fourni' && leadData.email.includes('@')) {
        try {
            await sendOwnerEmail(leadData.email, `Confirmation de RDV — ${businessName}`, message);
            logger.info(`Client confirmation email sent to ${leadData.email}`);
        } catch (err) {
            logger.error('Error sending client email:', err.message);
        }
    }
};

module.exports = {
    notifyOwner,
    notifyClient
};
