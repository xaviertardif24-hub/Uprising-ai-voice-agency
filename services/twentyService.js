const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Finds an existing company by name or creates a new one
 * @param {string} name 
 * @returns {string|null} Company ID
 */
const findOrCreateCompany = async (name) => {
    if (!config.crm.twentyApiKey) return null;
    try {
        // 1. Search for existing company
        const searchRes = await axios.get(`${config.crm.twentyUrl}/companies`, {
            params: { filter: { name: { eq: name } } },
            headers: { 'Authorization': `Bearer ${config.crm.twentyApiKey}` }
        });

        if (searchRes.data?.data && searchRes.data.data.length > 0) {
            return searchRes.data.data[0].id;
        }

        // 2. Create if not found
        const createRes = await axios.post(`${config.crm.twentyUrl}/companies`, {
            name: name
        }, {
            headers: {
                'Authorization': `Bearer ${config.crm.twentyApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return createRes.data?.data?.id || createRes.data?.id;
    } catch (err) {
        logger.error('Error finding/creating Twenty company:', err.response?.data || err.message);
        return null;
    }
};

/**
 * Creates a Person (Lead) in Twenty CRM and links to Company
 * @param {Object} leadData 
 */
const createTwentyLead = async (leadData) => {
    if (!config.crm.twentyApiKey) {
        logger.warn('Twenty CRM API key missing. Skipping remote sync.');
        return;
    }

    try {
        const companyId = await findOrCreateCompany(leadData.businessName);

        const nameParts = leadData.name.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Inconnu';
        const lastName = nameParts.slice(1).join(' ') || 'N/A';

        const payload = {
            firstName: firstName,
            lastName: lastName,
            emails: {
                primaryEmail: leadData.email && leadData.email !== 'Non fourni' ? leadData.email : undefined
            },
            phones: {
                primaryPhone: leadData.phone
            },
            jobTitle: leadData.project || 'Lead AI',
            description: `[Résumé d'appel] : ${leadData.details}`
        };

        if (companyId) {
            payload.companyId = companyId;
        }

        const response = await axios.post(`${config.crm.twentyUrl}/people`, payload, {
            headers: {
                'Authorization': `Bearer ${config.crm.twentyApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        logger.info(`Lead [${leadData.name}] successfully synced to Twenty CRM (Linked to Company: ${leadData.businessName})`);
        return response.data;
    } catch (err) {
        const errorDetail = err.response?.data || err.message;
        logger.error('Twenty CRM sync failed:', errorDetail);
    }
};

module.exports = { createTwentyLead };
