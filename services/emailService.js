const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Sends an email notification to the business owner
 * @param {string} to 
 * @param {string} subject 
 * @param {string} text 
 */
const sendOwnerEmail = async (to, subject, text) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn('SMTP credentials missing. Skipping email notification.');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: `"Uprising AI Receptionist" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text
        });

        logger.info(`Email notification sent to ${to}: ${info.messageId}`);
    } catch (err) {
        logger.error('Error sending email:', err.message);
    }
};

module.exports = { sendOwnerEmail };
