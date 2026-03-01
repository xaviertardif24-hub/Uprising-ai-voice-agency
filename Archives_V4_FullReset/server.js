require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Google Calendar Setup
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const KEY_PATH = path.join(__dirname, 'credentials.json');
const CALENDAR_ID = process.env.CALENDAR_ID;

let auth;
if (process.env.GOOGLE_CREDENTIALS_JSON) {
    auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
        scopes: SCOPES,
    });
} else {
    auth = new google.auth.GoogleAuth({
        keyFile: KEY_PATH,
        scopes: SCOPES,
    });
}
const calendar = google.calendar({ version: 'v3', auth });

// Home route
app.get('/', (req, res) => {
    res.send('IA Réceptionniste Sophie 3.0 est en ligne ! 🚀');
});

// Bland AI Webhook
app.post('/webhook/bland-ai', async (req, res) => {
    const data = req.body;
    console.log('📬 Webhook reçu de Bland AI');

    const vars = data.variables || {};
    const summary = data.summary || 'Pas de résumé';
    const phone = data.to || data.phone_number || 'Inconnu';

    // Extraction des données (Variables mappées dans agent-config.json)
    const name = vars.client_name || vars.nom || 'Inconnu';
    const project = vars.category || vars.projet || 'Non spécifié';
    const details = vars.details || vars.informations || 'Aucun détail';
    const apptDate = vars.appointment_date || vars.preferred_date;
    const apptTime = vars.appointment_time || vars.preferred_time;

    // 1. Sauvegarde CSV
    const dateStr = new Date().toLocaleString('fr-CA');
    const csvPath = path.join(__dirname, 'leads.csv');
    const csvLine = `"${dateStr}","${name}","${phone}","${project}","${details}","${apptDate || ''}","${apptTime || ''}"\n`;

    try {
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, 'Date,Nom,Téléphone,Projet,Détails,Date RV,Heure RV\n', 'utf8');
        }
        fs.appendFileSync(csvPath, csvLine, 'utf8');
        console.log('✅ Lead enregistré dans leads.csv');
    } catch (err) {
        console.error('❌ Erreur CSV:', err.message);
    }

    // 2. Notification SMS (Twilio)
    try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const body = `🔔 Nouveau Lead : ${name}\n📞 ${phone}\n🏗️ Projet : ${project}\n📅 RDV : ${apptDate || 'À fixer'} ${apptTime || ''}`;

        await twilio.messages.create({
            body: body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.PHONE_NUMBER_TO_CALL
        });
        console.log('📲 SMS de notification envoyé');
    } catch (err) {
        console.error('❌ Erreur SMS:', err.message);
    }

    // 3. Google Calendar
    if (apptDate && apptTime) {
        try {
            const startStr = `${apptDate}T${apptTime}:00`;
            const startDateTime = new Date(startStr);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            await calendar.events.insert({
                calendarId: CALENDAR_ID,
                resource: {
                    summary: `RDV Estimation : ${name}`,
                    description: `Projet: ${project}\nDetails: ${details}\nTel: ${phone}`,
                    start: { dateTime: startDateTime.toISOString() },
                    end: { dateTime: endDateTime.toISOString() },
                },
            });
            console.log('📅 Rendez-vous ajouté au calendrier');
        } catch (err) {
            console.error('❌ Erreur Calendrier:', err.message);
        }
    }

    res.status(200).json({ status: 'success' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
