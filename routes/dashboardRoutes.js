const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { initiateCall: initiateBlandCall } = require('../services/blandService');
const { initiateDograhCall } = require('../services/dograhService');
const { registerInboundNumber, listInboundNumbers } = require('../services/inboundService');
const { scrapeCompanyWebsite, generateAgentPrompt } = require('../services/webScraperService');
const logger = require('../utils/logger');

const envConfigPath = path.join(__dirname, '../config/environments.json');

// GET current configuration
router.get('/config', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        res.json(data);
    } catch (err) {
        logger.error('Error reading environments.json:', err.message);
        res.status(500).json({ error: 'Failed to read configuration' });
    }
});

// POST update active environment
router.post('/active-environment', (req, res) => {
    const { active_environment } = req.body;
    try {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        if (!data.environments[active_environment]) {
            return res.status(400).json({ error: 'Invalid environment ID' });
        }
        data.active_environment = active_environment;
        fs.writeFileSync(envConfigPath, JSON.stringify(data, null, 4));
        config.activeEnv = data.environments[active_environment];
        logger.info(`Active environment switched to: ${active_environment}`);
        res.json({ success: true, active_environment });
    } catch (err) {
        logger.error('Error updating active environment:', err.message);
        res.status(500).json({ error: 'Failed to update active environment' });
    }
});

// POST update specific environment details
router.post('/update-environment', (req, res) => {
    const { id, prompt_template, owner_email, owner_phone, availability, name, description } = req.body;
    try {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        if (!data.environments[id]) {
            return res.status(400).json({ error: 'Environment not found' });
        }

        if (prompt_template !== undefined) data.environments[id].prompt_template = prompt_template;
        if (owner_email !== undefined) data.environments[id].owner_email = owner_email;
        if (owner_phone !== undefined) data.environments[id].owner_phone = owner_phone;
        if (availability !== undefined) data.environments[id].availability = availability;
        if (name !== undefined) data.environments[id].name = name;
        if (description !== undefined) data.environments[id].description = description;

        fs.writeFileSync(envConfigPath, JSON.stringify(data, null, 4));

        if (data.active_environment === id) {
            config.activeEnv = data.environments[id];
        }

        logger.info(`Environment ${id} updated via dashboard`);
        res.json({ success: true });
    } catch (err) {
        logger.error('Error updating environment:', err.message);
        res.status(500).json({ error: 'Failed to update environment' });
    }
});

// POST trigger test call
router.post('/test-call', async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'Phone number is required' });

    try {
        logger.info(`Dashboard initiating test call (Provider: ${config.voiceProvider}) to ${phone_number}`);
        let result;
        if (config.voiceProvider === 'dograh') {
            result = await initiateDograhCall(phone_number, { source: 'dashboard_test' });
        } else {
            result = await initiateBlandCall(phone_number, { source: 'dashboard_test' });
        }

        if (!result) {
            return res.status(400).json({ error: `API Key manquante pour ${config.voiceProvider}. Veuillez configurer votre .env` });
        }

        res.json({ success: true, call_id: result.call_id || result.session_id || 'N/A' });
    } catch (err) {
        logger.error('Dashboard test call failed:', err.stack);
        res.status(500).json({ error: 'Failed to initiate call', details: err.message });
    }
});

// GET call history from Bland AI
const { listCalls } = require('../services/blandService');
router.get('/calls', async (req, res) => {
    try {
        const calls = await listCalls();
        res.json(calls);
    } catch (err) {
        logger.error('Error fetching calls:', err.message);
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// GET leads from CSV
router.get('/leads', (req, res) => {
    const csvPath = path.join(__dirname, '../leads.csv');
    try {
        if (!fs.existsSync(csvPath)) return res.json([]);
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length <= 1) return res.json([]);

        const leads = lines.slice(1).map(line => {
            const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
            const clean = values.map(v => v.replace(/^\"|\"$/g, ''));

            // Format with ID and Status support
            if (clean.length >= 11) { // Latest format with ID + Status
                return {
                    id: clean[0], timestamp: clean[1], business: clean[2], name: clean[3],
                    phone: clean[4], email: clean[5], project: clean[6],
                    details: clean[7], date: clean[8], time: clean[9], status: clean[10] || 'Nouveau'
                };
            } else if (clean.length >= 10) { // Format with ID but no status
                return {
                    id: clean[0], timestamp: clean[1], business: clean[2], name: clean[3],
                    phone: clean[4], email: clean[5], project: clean[6],
                    details: clean[7], date: clean[8], time: clean[9], status: 'Nouveau'
                };
            } else { // Legacy format
                return {
                    id: clean[0], timestamp: clean[0], business: clean[1], name: clean[2],
                    phone: clean[3], email: clean[4], project: clean[5],
                    details: clean[6], date: clean[7], time: clean[8], status: 'Nouveau'
                };
            }
        });
        res.json(leads.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// POST book appointment
const { addCalendarEvent } = require('../services/calendarService');
router.post('/book-appointment', async (req, res) => {
    try {
        await addCalendarEvent(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to book' });
    }
});

// POST add new environment (basic)
router.post('/add-environment', (req, res) => {
    const { id, name, description, voice_id } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'ID and Name are required' });

    try {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        if (data.environments[id]) return res.status(400).json({ error: 'Agent ID already exists' });

        const newEnv = {
            id: id,
            name: name,
            voice_id: voice_id || 'GlFfG24S1tGjIdW8p7pX',
            owner_email: '',
            owner_phone: '',
            description: description || 'Nouveau business',
            objectives: [
                "Identifier le besoin du client",
                "Récupérer NOM et TÉLÉPHONE",
                "Fixer un rendez-vous"
            ],
            prompt_template: `Tu es un assistant virtuel pour ${name}. ${description}\n\nMissions :\n1. Accueil poli.\n2. Identifier le besoin.\n3. Prendre les coordonnées (NOM, TEL).\n4. Fixer le RDV.\n\nExtraction :\n- client_name: Nom\n- client_phone: Téléphone\n- appointment_date: Date (YYYY-MM-DD)\n- appointment_time: Heure (HH:mm)`
        };

        data.environments[id] = newEnv;
        fs.writeFileSync(envConfigPath, JSON.stringify(data, null, 4));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add agent' });
    }
});

// DELETE environment
router.delete('/delete-environment/:id', (req, res) => {
    const { id } = req.params;
    try {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        if (!data.environments[id]) {
            return res.status(404).json({ error: 'Environment not found' });
        }

        // Prevent deleting active environment
        if (data.active_environment === id) {
            const remaining = Object.keys(data.environments).filter(k => k !== id);
            if (remaining.length > 0) {
                data.active_environment = remaining[0];
                config.activeEnv = data.environments[remaining[0]];
            } else {
                return res.status(400).json({ error: 'Cannot delete the last environment' });
            }
        }

        delete data.environments[id];
        fs.writeFileSync(envConfigPath, JSON.stringify(data, null, 4));
        logger.info(`Environment ${id} deleted`);
        res.json({ success: true, active_environment: data.active_environment });
    } catch (err) {
        logger.error('Error deleting environment:', err.message);
        res.status(500).json({ error: 'Failed to delete environment' });
    }
});

// POST scrape company website
router.post('/scrape-company', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const companyData = await scrapeCompanyWebsite(url);
        res.json({ success: true, data: companyData });
    } catch (err) {
        logger.error('Scrape failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST create smart agent from company data
router.post('/create-smart-agent', (req, res) => {
    const { id, companyData, customInstructions, owner_email, owner_phone, voice_id } = req.body;
    if (!id || !companyData) return res.status(400).json({ error: 'ID and company data required' });

    try {
        const data = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        if (data.environments[id]) return res.status(400).json({ error: 'Agent ID already exists' });

        const prompt = generateAgentPrompt(companyData, customInstructions || '');

        const newEnv = {
            id: id,
            name: companyData.name || 'Nouvel Agent',
            voice_id: voice_id || 'GlFfG24S1tGjIdW8p7pX',
            owner_email: owner_email || '',
            owner_phone: owner_phone || '',
            description: companyData.description || '',
            logo: companyData.logo || null,
            website: companyData.sourceUrl || '',
            services: companyData.services || [],
            faq: companyData.faq || [],
            contact: companyData.contact || {},
            objectives: [
                "Accueillir le client chaleureusement",
                "Identifier le besoin du client",
                "Récupérer NOM, TÉLÉPHONE et EMAIL",
                "Fixer un rendez-vous"
            ],
            prompt_template: prompt,
            availability: {
                start: '08:00',
                end: '18:00'
            }
        };

        data.environments[id] = newEnv;
        fs.writeFileSync(envConfigPath, JSON.stringify(data, null, 4));
        logger.info(`Smart agent "${companyData.name}" created from URL: ${companyData.sourceUrl}`);
        res.json({ success: true, agent: newEnv });
    } catch (err) {
        logger.error('Error creating smart agent:', err.message);
        res.status(500).json({ error: 'Failed to create smart agent' });
    }
});

// POST register inbound phone number with Bland AI
router.post('/register-inbound', async (req, res) => {
    const { phone_number, agent_id } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'Phone number is required' });

    try {
        const result = await registerInboundNumber(phone_number, agent_id);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET list inbound numbers
router.get('/inbound-numbers', async (req, res) => {
    try {
        const numbers = await listInboundNumbers();
        res.json({ success: true, data: numbers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET analytics summary
router.get('/analytics', (req, res) => {
    const csvPath = path.join(__dirname, '../leads.csv');
    try {
        if (!fs.existsSync(csvPath)) return res.json({ totalLeads: 0, todayLeads: 0, thisWeek: 0, byBusiness: {} });

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length <= 1) return res.json({ totalLeads: 0, todayLeads: 0, thisWeek: 0, byBusiness: {} });

        const leads = lines.slice(1);
        const today = new Date().toLocaleDateString('fr-CA');
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        let todayLeads = 0;
        let thisWeek = 0;
        const byBusiness = {};

        leads.forEach(line => {
            const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
            if (values.length < 2) return;
            const clean = values.map(v => v.replace(/^\"|\"$/g, ''));

            // If first column is ID, date is clean[1]. If first is Date, it's clean[0].
            const dateStr = (clean[0] && clean[0].includes('-')) ? clean[0] : (clean[1] || '');
            const business = (clean[0] && clean[0].includes('-')) ? clean[1] : (clean[2] || 'N/A');

            if (dateStr.includes(today)) todayLeads++;
            try {
                const leadDate = new Date(dateStr);
                if (leadDate >= weekAgo) thisWeek++;
            } catch { }

            byBusiness[business] = (byBusiness[business] || 0) + 1;
        });

        res.json({
            totalLeads: leads.length,
            todayLeads,
            thisWeek,
            byBusiness
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to compute analytics' });
    }
});

// UPDATE lead status by ID
router.put('/leads/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const csvPath = path.join(__dirname, '../leads.csv');

    if (!status) return res.status(400).json({ error: 'Status is required' });

    try {
        if (!fs.existsSync(csvPath)) return res.status(404).json({ error: 'No leads found' });

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n');
        const header = lines[0];

        const updatedLines = lines.slice(1).map(line => {
            if (!line.trim()) return line;
            const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanId = values[0]?.replace(/^\"|\"$/g, '');

            if (cleanId === id) {
                // Keep first 10 values, update/add 11th
                const newValues = values.slice(0, 10);
                while (newValues.length < 10) newValues.push('""');
                newValues[10] = `"${status}"`;
                return newValues.join(',');
            }
            return line;
        });

        fs.writeFileSync(csvPath, [header, ...updatedLines].join('\n'), 'utf8');
        res.json({ success: true });
    } catch (err) {
        logger.error('Error updating lead status:', err.message);
        res.status(500).json({ error: 'Failed to update lead status' });
    }
});

// DELETE lead by ID
router.delete('/leads/:id', (req, res) => {
    const { id } = req.params;
    const csvPath = path.join(__dirname, '../leads.csv');
    try {
        if (!fs.existsSync(csvPath)) return res.status(404).json({ error: 'No leads found' });

        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n');
        const header = lines[0];

        const filteredLines = lines.slice(1).filter(line => {
            if (!line.trim()) return false;
            const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanId = values[0]?.replace(/^\"|\"$/g, '');
            return cleanId !== id;
        });

        const newContent = [header, ...filteredLines].join('\n') + (filteredLines.length > 0 ? '' : '');
        fs.writeFileSync(csvPath, newContent, 'utf8');

        logger.info(`Lead ${id} deleted`);
        res.json({ success: true });
    } catch (err) {
        logger.error('Error deleting lead:', err.message);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

// GET system status (connectivity check)
router.get('/system-status', (req, res) => {
    const status = {
        bland: {
            configured: !!config.bland.apiKey,
            key_preview: config.bland.apiKey ? `***${config.bland.apiKey.slice(-4)}` : 'Non configuré'
        },
        google: {
            configured: !!config.google.credentials,
            calendar_id: config.google.calendarId || 'Non configuré'
        },
        twenty: {
            configured: !!config.crm.twentyApiKey,
            url: config.crm.twentyUrl
        },
        server: {
            uptime: Math.floor(process.uptime()),
            version: '1.2.0',
            node_version: process.version
        }
    };
    res.json(status);
});

module.exports = router;
