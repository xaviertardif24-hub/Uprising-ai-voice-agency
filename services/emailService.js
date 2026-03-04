const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ─── Reusable transporter (lazy init) ────────────────────────────────────────
let _transporter = null;

const getTransporter = () => {
    if (_transporter) return _transporter;
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

    _transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    return _transporter;
};

/**
 * Sends an email (owner notification OR client confirmation).
 * Renamed from sendOwnerEmail to sendEmail for clarity.
 * @param {string} to
 * @param {string} subject
 * @param {string} text - Plain text fallback
 * @param {string} [html] - Optional HTML body
 */
const sendEmail = async (to, subject, text, html) => {
    const transporter = getTransporter();

    if (!transporter) {
        logger.warn('SMTP credentials missing. Skipping email notification.');
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Uprising AI Receptionnaire" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || buildDefaultHtml(subject, text)
        });

        logger.info(`Email sent to ${to}: ${info.messageId}`);
    } catch (err) {
        logger.error('Error sending email:', err.message);
    }
};

/**
 * Builds a simple branded HTML email body.
 * @param {string} title
 * @param {string} text
 * @returns {string}
 */
const buildDefaultHtml = (title, text) => {
    const formattedText = text
        .replace(/\n/g, '<br>')
        .replace(/🔔/g, '🔔')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6C63FF,#4F46E5);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                🤖 Uprising AI Réceptionniste
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Notification automatique</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:18px;">${title}</h2>
              <div style="background:#f8f9ff;border-left:4px solid #6C63FF;padding:16px 20px;border-radius:0 8px 8px 0;color:#333;font-size:15px;line-height:1.6;">
                ${formattedText}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f9;padding:20px 32px;border-top:1px solid #e8eaf0;">
              <p style="margin:0;color:#888;font-size:12px;text-align:center;">
                Généré automatiquement par <strong>Uprising AI</strong> · Ne pas répondre à cet email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Backward compatibility alias
const sendOwnerEmail = sendEmail;

module.exports = { sendEmail, sendOwnerEmail, buildDefaultHtml };
