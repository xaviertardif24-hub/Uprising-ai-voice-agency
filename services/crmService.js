const config = require('../config/config');
const { logLead: logToCsv, findRecentLead } = require('../utils/csvLogger');
const logger = require('../utils/logger');

/**
 * Unified CRM Recording Service.
 * Records leads to CSV (always) and Twenty CRM (if configured).
 * @param {Object} leadData
 */
const recordLead = async (leadData) => {
    // ✅ Deduplicate by call_id (most reliable) AND by phone number (within 10 min)
    if (findRecentLead(leadData.phone, leadData.callId)) {
        logger.info(`Duplicate lead detected (phone: ${leadData.phone} | call_id: ${leadData.callId}). Skipping.`);
        return;
    }

    // 1. Always log to local CSV
    try {
        logToCsv(leadData);
        logger.info(`Lead for ${leadData.name} recorded in CSV`);
    } catch (err) {
        logger.error('Failed to log lead to CSV:', err.message);
    }

    // 2. Optional: Sync to Twenty CRM
    if (config.crm.twentyApiKey) {
        try {
            const { createTwentyLead } = require('./twentyService');
            await createTwentyLead(leadData);
        } catch (err) {
            logger.warn('Failed to sync with Twenty CRM:', err.message);
        }
    }
};

module.exports = { recordLead };
