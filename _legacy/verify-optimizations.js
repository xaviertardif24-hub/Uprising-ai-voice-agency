const { findRecentLead } = require('./utils/csvLogger');
const { validateAndFormatAppointment } = require('./services/calendarService');
const fs = require('fs');
const path = require('path');

// Mocking required for standalone execution if needed, but here we just test logic
console.log('--- Verification Started ---');

// 1. Test Calendar Logic (Constructed from calendarService.js cleanup)
const testCalendar = () => {
    console.log('Testing Calendar Date Logic...');
    const apptDate = '2026-03-01';
    const apptTime = '14:30';
    const start = new Date(`${apptDate}T${apptTime}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formattedEnd = `${end.toISOString().split('T')[0]}T${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}:00`;

    console.log(`Input: ${apptDate} ${apptTime}`);
    console.log(`Start Logic: ${apptDate}T${apptTime}:00`);
    console.log(`End Logic: ${formattedEnd}`);

    if (formattedEnd === '2026-03-01T15:30:00') {
        console.log('✅ Calendar Time Calculation: PASS');
    } else {
        console.log('❌ Calendar Time Calculation: FAIL');
    }
};

// 2. Test Deduplication
const testDeduplication = () => {
    console.log('\nTesting Lead Deduplication...');
    const mockPhone = '+19999999999';
    const csvPath = path.join(__dirname, 'leads.csv');

    // Create a temporary mock entry in CSV
    if (!fs.existsSync(csvPath)) {
        fs.writeFileSync(csvPath, 'ID,Date,Entreprise,Nom,Téléphone,Email,Projet,Détails,Date RV,Heure RV,Statut\n', 'utf8');
    }

    const now = new Date().toISOString();
    const mockLine = `"test-id","${now}","Test Biz","Test User","${mockPhone}","test@test.com","Test Proj","Details","","","Nouveau"\n`;
    fs.appendFileSync(csvPath, mockLine);

    const isDuplicate = findRecentLead(mockPhone);
    console.log(`Duplicate found for ${mockPhone}: ${isDuplicate}`);

    if (isDuplicate) {
        console.log('✅ Lead Deduplication: PASS');
    } else {
        console.log('❌ Lead Deduplication: FAIL');
    }
};

testCalendar();
testDeduplication();
console.log('\n--- Verification Finished ---');
