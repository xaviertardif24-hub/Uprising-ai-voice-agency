const express = require('express');
const router = express.Router();
const config = require('../config/config');
const logger = require('../utils/logger');
const { recordLead } = require('../services/crmService');
const { notifyOwner, notifyClient } = require('../services/smsService');
const { addCalendarEvent } = require('../services/calendarService');
const { sendOwnerEmail } = require('../services/emailService');
const { processInboundCall } = require('../services/inboundService');

/**
 * Middleware-like helper to verify webhook secret.
 * Webhooks from Bland AI or Dograh should include ?secret=... or a 'x-webhook-secret' header.
 */
const verifySecret = (req) => {
    const receivedSecret = req.query.secret || req.headers['x-webhook-secret'];
    if (!config.webhookSecret) return true; // Security disabled if no secret configured
    return receivedSecret === config.webhookSecret;
};

// Bland AI Outbound Call Webhook (Dynamic Route)
router.post('/bland-ai/:agentId?', async (req, res) => {
    if (!verifySecret(req)) {
        logger.warn('Unauthorized webhook attempt: Invalid or missing secret');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = req.body;
    const { agentId } = req.params;
    const direction = data.inbound ? 'inbound' : 'outbound';
    logger.info(`Webhook received from Bland AI (Agent: ${agentId || 'default'}, Direction: ${direction})`);

    try {
        const vars = data.variables || {};
        const env = agentId ? config.getEnvironment(agentId) : config.activeEnv;

        const leadData = {
            name: vars.client_name || vars.nom || data.from || 'Client Inconnu',
            phone: vars.client_phone || data.from || data.to || data.phone_number || 'Inconnu',
            email: vars.client_email || 'Non fourni',
            project: vars.category || vars.projet || 'Non spécifié',
            details: vars.details || vars.informations || data.summary || 'Appel traité par Sophie AI',
            apptDate: vars.appointment_date || vars.preferred_date,
            apptTime: vars.appointment_time || vars.preferred_time,
            businessName: env?.name || 'Uprising AI',
            ownerEmail: env?.owner_email,
            ownerPhone: env?.owner_phone,
            direction: direction,
            callId: data.call_id || null,
            duration: data.call_length || null,
            recording_url: data.recording_url || null,
            transcript: data.concatenated_transcript || ''
        };

        // Extraction spécifique garage
        if (env?.id === 'garage') {
            const carModel = vars.car_model || 'Non spécifié';
            leadData.details = `[Modèle: ${carModel}] - ${leadData.details}`;
        }

        logger.info(`Processing ${direction} lead for ${leadData.businessName}: ${leadData.name}`);

        // 1. Log to CSV & CRM
        await recordLead(leadData);

        // 2. Add to Google Calendar (if appointment detected)
        await addCalendarEvent(leadData);

        // 3. Notify Client (SMS/Email confirmation)
        await notifyClient(leadData);

        // 4. Notify Owner (Email + optional SMS)
        await notifyOwner(leadData);

        res.status(200).json({ status: 'success', message: 'Lead processed', direction });
    } catch (err) {
        logger.error('Error processing webhook', err.message);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Bland AI Inbound Call Webhook
router.post('/bland-ai-inbound/:agentId?', async (req, res) => {
    if (!verifySecret(req)) return res.status(401).json({ error: 'Unauthorized' });

    const data = req.body;
    const { agentId } = req.params;
    logger.info(`📥 INBOUND call webhook received (Agent: ${agentId || 'default'})`);

    try {
        const callInfo = processInboundCall(data, agentId);
        const vars = data.variables || {};
        const env = agentId ? config.getEnvironment(agentId) : config.activeEnv;

        const leadData = {
            name: vars.client_name || vars.nom || 'Appelant',
            phone: callInfo.from || 'Inconnu',
            email: vars.client_email || 'Non fourni',
            project: vars.category || 'Appel entrant',
            details: callInfo.summary || vars.details || 'Appel entrant traité par IA',
            apptDate: vars.appointment_date,
            apptTime: vars.appointment_time,
            businessName: env?.name || 'Uprising AI',
            ownerEmail: env?.owner_email,
            ownerPhone: env?.owner_phone,
            direction: 'inbound',
            callId: callInfo.callId,
            duration: callInfo.duration,
            recording_url: callInfo.recording_url,
            transcript: callInfo.transcript
        };

        // Full pipeline
        await recordLead(leadData);
        await addCalendarEvent(leadData);
        await notifyClient(leadData);
        await notifyOwner(leadData);

        res.status(200).json({ status: 'success', direction: 'inbound', callId: callInfo.callId });
    } catch (err) {
        logger.error('Error processing inbound call webhook:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Dograh Dynamic Route
router.post('/dograh/:agentId?', async (req, res) => {
    if (!verifySecret(req)) return res.status(401).json({ error: 'Unauthorized' });

    const data = req.body;
    const { agentId } = req.params;
    logger.info(`Webhook received from Dograh Agent (Agent: ${agentId || 'default'})`);

    try {
        const env = agentId ? config.getEnvironment(agentId) : config.activeEnv;
        const leadData = {
            name: data.variables?.client_name || data.caller?.name || 'Inconnu',
            phone: data.caller?.phone || data.variables?.client_phone || 'Inconnu',
            email: data.variables?.client_email || 'Non fourni',
            project: data.variables?.category || data.intent || 'Non spécifié',
            details: data.summary || data.variables?.details || 'Aucun détail',
            apptDate: data.variables?.appointment_date,
            apptTime: data.variables?.appointment_time,
            businessName: env?.name || 'Uprising AI',
            ownerEmail: env?.owner_email,
            ownerPhone: env?.owner_phone,
            direction: data.direction || 'outbound'
        };

        logger.info(`Processing Dograh lead: ${leadData.name}`);

        await recordLead(leadData);
        await addCalendarEvent(leadData);
        await notifyClient(leadData);
        await notifyOwner(leadData);

        res.status(200).json({ status: 'success' });
    } catch (err) {
        logger.error('Dograh webhook error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
