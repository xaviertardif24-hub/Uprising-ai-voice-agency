const { google } = require('googleapis');
const config = require('../config/config');
const logger = require('../utils/logger');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

let calendar;

const initCalendar = () => {
    try {
        let auth;
        if (config.google.credentials) {
            auth = new google.auth.GoogleAuth({
                credentials: config.google.credentials,
                scopes: SCOPES,
            });
        } else {
            const keyPath = path.resolve(config.google.keyPath);
            auth = new google.auth.GoogleAuth({
                keyFile: keyPath,
                scopes: SCOPES,
            });
        }
        calendar = google.calendar({ version: 'v3', auth });
        logger.info('Google Calendar service initialized');
    } catch (err) {
        logger.error('Failed to initialize Google Calendar service', err.message);
    }
};

/**
 * Validates and formats appointment date/time for America/Toronto (Quebec/Montreal)
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm
 * @returns {Object|null} { start, end } or null if invalid
 */
const validateAndFormatAppointment = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;

    try {
        // America/Toronto offset is either -05:00 (EST) or -04:00 (EDT)
        // For simplicity and robustness, we use a fixed offset of -05:00 or -04:00 
        // Or better, let Google handle the timezone by providing the timeZone field.

        // We construct the ISO string: YYYY-MM-DDTHH:mm:00
        const startStr = `${dateStr}T${timeStr}:00`;
        const startDate = new Date(startStr);

        // Validation: Must be in the future
        if (startDate < new Date()) {
            logger.warn(`Appointment date ${startStr} is in the past. Skipping.`);
            return null;
        }

        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

        return {
            start: {
                dateTime: startDate.toISOString().split('.')[0] + 'Z', // Placeholder, we will use timeZone
                timeZone: 'America/Toronto'
            },
            end: {
                dateTime: endDate.toISOString().split('.')[0] + 'Z',
                timeZone: 'America/Toronto'
            }
        };
    } catch (err) {
        logger.error('Error validating appointment date:', err.message);
        return null;
    }
};

const addCalendarEvent = async (leadData) => {
    if (!calendar) initCalendar();

    const { name, phone, email, project, details, apptDate, apptTime } = leadData;

    try {
        const businessName = leadData.businessName || 'Uprising AI';

        // Construct dates for validation
        const start = new Date(`${apptDate}T${apptTime}:00`);
        if (isNaN(start.getTime())) {
            logger.info('Invalid appointment data. Skipping calendar event.');
            return;
        }

        if (start < new Date()) {
            logger.warn(`Appointment date ${apptDate} ${apptTime} is in the past. Skipping.`);
            return;
        }

        const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour duration

        const resource = {
            summary: `📅 RDV ${businessName} - ${name}`,
            description: `DÉTAILS DU RENDEZ-VOUS\n` +
                `--------------------------\n` +
                `👤 Client : ${name}\n` +
                `📞 Téléphone : ${phone}\n` +
                `📧 Email : ${email || 'Non fourni'}\n` +
                `🏗️ Projet : ${project}\n` +
                `📝 Notes : ${details}\n\n` +
                `Généré automatiquement par Sophie AI.`,
            start: {
                dateTime: `${apptDate}T${apptTime}:00`,
                timeZone: 'America/Toronto'
            },
            end: {
                dateTime: `${end.toISOString().split('T')[0]}T${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}:00`,
                timeZone: 'America/Toronto'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 30 },
                ],
            },
        };

        if (email && email !== 'Non fourni' && email.includes('@')) {
            resource.attendees = [{ email }];
        }

        await calendar.events.insert({
            calendarId: config.google.calendarId,
            resource: resource,
            sendUpdates: 'all',
        });
        logger.info(`Calendar event created for ${name} at ${apptDate} ${apptTime} (America/Toronto)`);
    } catch (err) {
        logger.error('Error creating calendar event:', err.message);
    }
};

module.exports = { addCalendarEvent };
