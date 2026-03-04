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
 * Adds a calendar event for a booked appointment.
 * Always uses America/Toronto timezone with local date strings (no UTC conversion bug).
 * @param {Object} leadData
 */
const addCalendarEvent = async (leadData) => {
    if (!calendar) initCalendar();

    const { name, phone, email, project, details, apptDate, apptTime } = leadData;

    // Skip if no valid date/time
    if (!apptDate || !apptTime) {
        logger.info('No appointment data found. Skipping calendar event.');
        return;
    }

    // Validate format
    const dateTimeStr = `${apptDate}T${apptTime}:00`;
    const startDate = new Date(dateTimeStr);
    if (isNaN(startDate.getTime())) {
        logger.warn(`Invalid appointment date/time format: "${dateTimeStr}". Skipping.`);
        return;
    }

    // Skip past appointments
    if (startDate < new Date()) {
        logger.warn(`Appointment date ${apptDate} ${apptTime} is in the past. Skipping.`);
        return;
    }

    try {
        const businessName = leadData.businessName || 'Uprising AI';

        // Calculate end time (+1 hour) using local time components to avoid timezone drift
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const endHour = endDate.getHours().toString().padStart(2, '0');
        const endMin = endDate.getMinutes().toString().padStart(2, '0');
        const endDateStr = endDate.toISOString().split('T')[0];
        const endTimeStr = `${endDateStr}T${endHour}:${endMin}:00`;

        const resource = {
            summary: `📅 RDV ${businessName} - ${name}`,
            description:
                `DÉTAILS DU RENDEZ-VOUS\n` +
                `--------------------------\n` +
                `👤 Client : ${name}\n` +
                `📞 Téléphone : ${phone}\n` +
                `📧 Email : ${email || 'Non fourni'}\n` +
                `🏗️ Projet : ${project}\n` +
                `📝 Notes : ${details}\n\n` +
                `Généré automatiquement par Sophie AI.`,
            // ✅ FIX: Use raw local date strings + timeZone (NOT .toISOString() which converts to UTC)
            start: {
                dateTime: `${apptDate}T${apptTime}:00`,
                timeZone: 'America/Toronto'
            },
            end: {
                dateTime: endTimeStr,
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

        logger.info(`✅ Calendar event created for ${name} at ${apptDate} ${apptTime} (America/Toronto)`);
    } catch (err) {
        logger.error('Error creating calendar event:', err.message);
    }
};

module.exports = { addCalendarEvent };
