const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, Postman, server-side)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // In production, block unknown origins
        if (process.env.NODE_ENV === 'production') {
            return callback(new Error(`CORS blocked: ${origin}`), false);
        }
        return callback(null, true); // Allow all in dev
    },
    credentials: true
}));

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes, veuillez réessayer dans 15 minutes.' }
});

const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Max 30 webhooks per minute (generous for Bland AI retries)
    message: { error: 'Webhook rate limit exceeded.' }
});

app.use('/api/', apiLimiter);
app.use('/webhook/', webhookLimiter);

// ─── BODY PARSING ────────────────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// ─── STATIC FILES ────────────────────────────────────────────────────────────
app.use(express.static('public'));

// ─── ERROR HANDLING ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    logger.error('Unhandled Error:', err.stack);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(config.port, () => {
    logger.info(`✅ Server running on port ${config.port}`);
    logger.info(`🌍 Node env: ${process.env.NODE_ENV || 'development'}`);
});
