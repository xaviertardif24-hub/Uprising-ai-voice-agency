const express = require('express');
const router = express.Router();
const { chat } = require('../services/chatService');
const logger = require('../utils/logger');

/**
 * POST /api/chat
 * Body: { messages: [{role: "user"|"assistant", content: "..."}] }
 * Returns: { reply: "..." }
 */
router.post('/', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    // Validate message format
    const isValid = messages.every(m => m.role && m.content && typeof m.content === 'string');
    if (!isValid) {
        return res.status(400).json({ error: 'Each message must have role and content' });
    }

    try {
        const reply = await chat(messages);
        res.json({ reply });
    } catch (err) {
        logger.error('[Chat Route] Error:', err.message);

        if (err.message.includes('OPENAI_API_KEY')) {
            return res.status(503).json({
                error: 'Chat service not configured',
                details: 'Add OPENAI_API_KEY to your .env file.'
            });
        }

        res.status(500).json({ error: 'Chat service temporarily unavailable' });
    }
});

module.exports = router;
