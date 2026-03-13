const { getActivePrompt, renderPrompt } = require('./services/promptService');
const config = require('./config/config');

console.log('--- Testing Prompt Generation ---');

// Test 1: Active Environment (should be Renovation by default)
console.log('\n1. Active Environment Prompt:');
console.log('Active Env:', config.activeEnv.name);
console.log('Prompt:\n', getActivePrompt());

// Test 2: Switching to Dentist
console.log('\n2. Dentist Environment Prompt:');
const dentist = config.getEnvironment('dentist');
if (dentist) {
    console.log('Prompt:\n', renderPrompt(dentist.prompt_template, dentist));
} else {
    console.log('❌ Dentist environment not found');
}

// Test 3: Switching to Garage
console.log('\n3. Garage Environment Prompt:');
const garage = config.getEnvironment('garage');
if (garage) {
    console.log('Prompt:\n', renderPrompt(garage.prompt_template, garage));
} else {
    console.log('❌ Garage environment not found');
}
