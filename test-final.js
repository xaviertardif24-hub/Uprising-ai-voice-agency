const { recordLead } = require('./services/crmService');
const { sendSmsNotification } = require('./services/fonosterService');
const { addCalendarEvent } = require('./services/calendarService');
const { sendOwnerEmail } = require('./services/emailService');
const config = require('./config/config');
const logger = require('./utils/logger');

const testLead = {
    name: "Test Perfection",
    phone: "+15144515232",
    email: "test@example.com",
    project: "Rénovation Cuisine",
    details: "Client très intéressé par une cuisine moderne. Préférence pour le marbre.",
    apptDate: "2026-03-01",
    apptTime: "14:00",
    businessName: "Rénovation Expert Québec",
    ownerEmail: config.activeEnv?.owner_email || "xavier.tardif24@hotmail.com",
    ownerPhone: config.activeEnv?.owner_phone || "+14388679020"
};

async function runFinalTest() {
    console.log('🧪 Lancement de la vérification FINALE...');

    try {
        console.log('1. Test CRM (Twenty + CSV)...');
        await recordLead(testLead);

        console.log('2. Test Google Calendar...');
        await addCalendarEvent(testLead);

        console.log('3. Test Notification Email Propriétaire...');
        await sendOwnerEmail(testLead.ownerEmail, "Test Perfection - Nouveau Lead", `Détails : ${testLead.details}`);

        console.log('4. Test Notification SMS Propriétaire...');
        await sendSmsNotification(testLead);

        console.log('\n✅ TOUT FONCTIONNE ! Les notifications et la CRM sont synchronisées.');
    } catch (err) {
        console.error('❌ ÉCHEC DU TEST:', err.message);
    }
}

runFinalTest();
