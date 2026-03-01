const { createTwentyLead } = require('./services/twentyService');
const logger = require('./utils/logger');

const testLead = {
    name: "John Advanced",
    phone: "+123456789",
    businessName: "Garage Mécanique Pro",
    details: "Test de liaison entreprise avancée phase 3.",
    project: "Moteur",
    email: "john@advanced.com"
};

async function verifyPhase3() {
    console.log('🧪 Vérification de la Phase 3 (Liaison Entreprise CRM)...');
    try {
        // This will trigger findOrCreateCompany and then createTwentyLead with companyId
        const result = await createTwentyLead(testLead);
        console.log('✅ Synchronisation terminée.');
        console.log('Résultat:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Échec de la vérification:', err.message);
    }
}

verifyPhase3();
