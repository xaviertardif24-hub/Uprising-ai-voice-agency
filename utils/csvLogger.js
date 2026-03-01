const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CSV_HEADER = 'ID,Date,Entreprise,Nom,Téléphone,Email,Projet,Détails,Date RV,Heure RV,Statut\n';
const CSV_PATH = path.join(__dirname, '..', 'leads.csv');

const logLead = (leadData) => {
    const { name, phone, email, project, details, apptDate, apptTime, businessName } = leadData;
    const dateStr = new Date().toISOString();
    const id = Date.now() + Math.random().toString(36).substr(2, 5); // Simple unique ID
    const csvLine = `"${id}","${dateStr}","${businessName || 'N/A'}","${name}","${phone}","${email || 'N/A'}","${project}","${details}","${apptDate || ''}","${apptTime || ''}","Nouveau"\n`;

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

const findRecentLead = (phone, maxMinutes = 5) => {
    if (!fs.existsSync(CSV_PATH)) return false;
    try {
        const content = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = content.trim().split('\n').reverse(); // Newest first
        const now = Date.now();

        for (const line of lines.slice(0, 20)) { // Check last 20 leads
            const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
            if (values.length < 5) continue;

            const leadPhone = values[4]?.replace(/^\"|\"$/g, '');
            const timestampStr = values[1]?.replace(/^\"|\"$/g, '');
            const leadTime = new Date(timestampStr).getTime();

            if (leadPhone === phone && (now - leadTime) < (maxMinutes * 60000)) {
                return true;
            }
        }
    } catch (err) {
        logger.error('Error checking for duplicates', err.message);
    }
    return false;
};

module.exports = { logLead, findRecentLead };
