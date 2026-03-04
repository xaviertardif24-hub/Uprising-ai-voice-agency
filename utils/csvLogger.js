const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CSV_HEADER = 'ID,Date,Entreprise,Nom,Téléphone,Email,Projet,Détails,Date RV,Heure RV,Statut,Recording URL,Outcome,Quality Flags\n';
const CSV_PATH = path.join(__dirname, '..', 'leads.csv');

const logLead = (leadData) => {
    const {
        name, phone, email, project, details,
        apptDate, apptTime, businessName,
        recording_url, call_outcome, quality_flags
    } = leadData;

    const dateStr = new Date().toISOString();
    const id = Date.now() + Math.random().toString(36).substr(2, 5);

    // Sanitize fields (prevent CSV injection and newlines inside cells)
    const sanitize = (val) => (val || '').toString().replace(/"/g, '""').replace(/\n|\r/g, ' ');

    const csvLine =
        `"${sanitize(id)}",` +
        `"${sanitize(dateStr)}",` +
        `"${sanitize(businessName || 'N/A')}",` +
        `"${sanitize(name)}",` +
        `"${sanitize(phone)}",` +
        `"${sanitize(email || 'N/A')}",` +
        `"${sanitize(project)}",` +
        `"${sanitize(details)}",` +
        `"${sanitize(apptDate || '')}",` +
        `"${sanitize(apptTime || '')}",` +
        `"Nouveau",` +
        `"${sanitize(recording_url || '')}",` +
        `"${sanitize(call_outcome || '')}",` +
        `"${sanitize(quality_flags || '')}"\n`;

    try {
        if (!fs.existsSync(CSV_PATH)) {
            fs.writeFileSync(CSV_PATH, CSV_HEADER, 'utf8');
        }
        fs.appendFileSync(CSV_PATH, csvLine, 'utf8');
        logger.info('Lead recorded in CSV');
    } catch (err) {
        logger.error('Error writing to CSV', err.message);
    }
};

/**
 * Checks for a recent duplicate lead by phone number OR call ID.
 * @param {string} phone
 * @param {string|null} callId - Bland AI call_id for exact deduplication
 * @param {number} maxMinutes - Time window for phone dedup
 * @returns {boolean}
 */
const findRecentLead = (phone, callId = null, maxMinutes = 10) => {
    if (!fs.existsSync(CSV_PATH)) return false;
    try {
        const content = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = content.trim().split('\n').reverse(); // Newest first

        const now = Date.now();

        for (const line of lines.slice(0, 50)) { // Check last 50 leads
            const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
            if (values.length < 5) continue;

            const leadPhone = values[4]?.replace(/^\"|\"$/g, '');
            const timestampStr = values[1]?.replace(/^\"|\"$/g, '');
            const leadTime = new Date(timestampStr).getTime();
            const leadId = values[0]?.replace(/^\"|\"$/g, '');

            // ✅ Dedup by exact call_id (most reliable)
            if (callId && leadId && leadId === callId) {
                logger.info(`Duplicate call_id detected: ${callId}. Skipping.`);
                return true;
            }

            // Dedup by phone within time window
            if (leadPhone === phone && !isNaN(leadTime) && (now - leadTime) < (maxMinutes * 60000)) {
                logger.info(`Duplicate phone number within ${maxMinutes}min: ${phone}. Skipping.`);
                return true;
            }
        }
    } catch (err) {
        logger.error('Error checking for duplicates', err.message);
    }
    return false;
};

module.exports = { logLead, findRecentLead };
