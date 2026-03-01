const config = require('../config/config');

/**
 * Renders a prompt template by replacing {{key}} with values from the environment.
 * @param {string} template 
 * @param {Object} environment 
 * @returns {string}
 */
const renderPrompt = (template, environment) => {
    let prompt = template;
    const coreData = {
        name: environment.name,
        description: environment.description,
        objectives: (environment.objectives || []).join('\n- ')
    };

    Object.keys(coreData).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        prompt = prompt.replace(regex, coreData[key]);
    });

    return prompt;
};

const getActivePrompt = () => {
    const env = config.activeEnv;
    return renderPrompt(env.prompt_template, env);
};

module.exports = {
    renderPrompt,
    getActivePrompt
};
