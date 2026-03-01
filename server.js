const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config/config');
const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check / Home route (Commented out to allow static index.html serving)
/*
app.get('/', (req, res) => {
    res.send('IA Réceptionniste Sophie 4.0 - Modular Version is online! 🚀');
});
*/

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Serve static files
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled Error:', err.stack);
    res.status(500).send('Something broke!');
});

app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
});
