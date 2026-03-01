const axios = require('axios');
const config = require('../config/config');
const { logLead: logToCsv, findRecentLead } = require('../utils/csvLogger');
const logger = require('../utils/logger');

/**
 * Unified CRM Recording Service
 * Records leads to CSV and optional CRM (HubSpot, etc.)
 * @param {Object} leadData 
 */
const recordLead = async (leadData) => {
    // 1. Check for duplicates (within 5 minutes for the same phone number)
    if (findRecentLead(leadData.phone)) {
        logger.info(`Duplicate lead detected for ${leadData.phone}. Skipping...`);
        return;
    }

    // 2. Always log to local CSV
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
            logger.warn('Failed to sync with Twenty CRM');
        }
    }

    // 3. n8n / custom automation fallback could go here
};

module.exports = { recordLead };
