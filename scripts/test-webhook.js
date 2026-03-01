const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/webhook';
const SECRET = process.env.BLAND_AI_WEBHOOK_SECRET || 'sophie-secure-2024';

async function runTests() {
    console.log('🚀 Starting System Optimization Verification...\n');
    console.log(`Configured Secret: ${SECRET}`);

    // Test 1: Webhook without secret (Should fail 401)
    try {
        console.log('\nTest 1: Webhook without secret...');
        await axios.post(`${BASE_URL}/bland-ai/renovation`, { call_id: 'test' });
        console.log('❌ FAIL: Webhook should have been rejected without secret.');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('✅ PASS: Unauthorized access blocked (401).');
        } else {
            console.log(`❌ FAIL: Unexpected error status/message: ${err.response?.status || err.message}`);
        }
    }

    // Test 2: Webhook with wrong secret (Should fail 401)
    try {
        console.log('\nTest 2: Webhook with wrong secret...');
        await axios.post(`${BASE_URL}/bland-ai/renovation?secret=WRONG_KEY`, { call_id: 'test' });
        console.log('❌ FAIL: Webhook should have been rejected with wrong secret.');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('✅ PASS: Incorrect secret blocked (401).');
        } else {
            console.log(`❌ FAIL: Unexpected error status/message: ${err.response?.status || err.message}`);
        }
    }

    // Test 3: Valid Webhook simulation
    try {
        console.log('\nTest 3: Valid Webhook with correct secret...');
        const response = await axios.post(`${BASE_URL}/bland-ai/renovation?secret=${SECRET}`, {
            call_id: 'test-optimized-call',
            call_length: 120,
            variables: {
                client_name: 'Test Optimization',
                client_phone: '5145550000',
                appointment_date: '2026-10-10', // Far in future
                appointment_time: '14:30',
                category: 'Verification Opti'
            }
        });
        if (response.status === 200) {
            console.log('✅ PASS: Webhook processed successfully with secret.');
        }
    } catch (err) {
        console.log(`❌ FAIL: Valid webhook rejected: ${err.message}`, err.response?.data);
    }

    console.log('\n🏁 Verification complete.');
}

runTests();
