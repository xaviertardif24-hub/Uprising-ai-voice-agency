const logger = require('../utils/logger');
const { sendEmail } = require('./emailService');

/**
 * Notification Service — Uses email as primary free channel.
 * Fonoster SMS is available as optional open-source integration.
 */

/**
 * Sends an owner notification email (and optional Fonoster SMS when configured).
 * @param {Object} leadData
 */
const notifyOwner = async (leadData) => {
    const { name, phone, project, apptDate, apptTime, businessName, ownerEmail, ownerPhone } = leadData;

    const textBody =
        `🔔 Nouveau Lead — ${businessName || 'Uprising AI'}\n` +
        `👤 ${name}\n` +
        `📞 ${phone}\n` +
        `🏗️ Projet: ${project || 'Non spécifié'}\n` +
        `📅 RDV: ${apptDate || 'À fixer'} ${apptTime || ''}\n` +
        `📝 Détails: ${leadData.details || 'Aucun'}\n` +
        (leadData.recording_url ? `🎙️ Enregistrement: ${leadData.recording_url}` : '');

    // 1. Always send email if configured
    if (ownerEmail) {
        try {
            await sendEmail(
                ownerEmail,
                `🔔 Nouveau Lead — ${name} | ${businessName}`,
                textBody
            );
            logger.info(`Owner email notification sent to ${ownerEmail}`);
        } catch (err) {
            logger.error('Failed to send owner email:', err.message);
        }
    }

    // 2. Optional: Fonoster SMS (open-source) — uncomment SDK lines when Fonoster is configured
    if (ownerPhone && process.env.FONOSTER_TOKEN && process.env.FONOSTER_PROJECT) {
        try {
            // const Fonoster = require("@fonoster/sdk");
            // const client = new Fonoster.Client({ accessKeyId: process.env.FONOSTER_TOKEN });
            // await client.messaging.sendSms({ from: process.env.FONOSTER_FROM_NUMBER, to: ownerPhone, body: textBody });
            logger.info(`[Fonoster] SMS would be sent to ${ownerPhone} (SDK not yet activated — uncomment lines in smsService.js)`);
        } catch (err) {
            logger.error('Fonoster SMS failed:', err.message);
        }
    }

    logger.info(`Owner notification dispatched for lead: ${name} (${businessName})`);
};

/**
 * Sends a client confirmation email when an appointment is booked.
 * @param {Object} leadData
 */
const notifyClient = async (leadData) => {
    const { name, phone, apptDate, apptTime, businessName } = leadData;

    // Only notify when there's a confirmed appointment
    if (!phone || phone === 'Inconnu' || !apptDate) return;

    const message =
        `Bonjour ${name},\n\n` +
        `Votre rendez-vous chez ${businessName || 'notre établissement'} est confirmé pour le **${apptDate}** à **${apptTime || "l'heure convenue"}**.\n\n` +
        `Si vous avez des questions, n'hésitez pas à nous contacter.\n\n` +
        `Merci de nous faire confiance !\n\n— L'équipe ${businessName}`;

    // Optional: Fonoster SMS
    if (process.env.FONOSTER_TOKEN && process.env.FONOSTER_PROJECT) {
        logger.info(`[Fonoster] Client SMS would be sent to ${phone} (SDK not yet activated)`);
    }

    // Send confirmation email if client provided one
    if (leadData.email && leadData.email !== 'Non fourni' && leadData.email.includes('@')) {
        try {
            await sendEmail(
                leadData.email,
                `✅ Confirmation de RDV — ${businessName}`,
                message
            );
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
