const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@thusanangfs.co.za';

const isConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS;

const createTransporter = () => {
    if (!isConfigured) return null;
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        },
        logger: true,
        debug: true
    });
};

const sendEmail = async ({ to, subject, text, html }) => {
    if (!isConfigured) {
        console.log('Email notifications are disabled because SMTP settings are not configured.');
        return false;
    }

    const transporter = createTransporter();
    if (!transporter) {
        console.log('Could not create email transporter.');
        return false;
    }

    const recipients = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;
    if (!recipients) {
        console.log('No email recipients provided.');
        return false;
    }

    const mailOptions = {
        from: MAIL_FROM,
        to: recipients,
        subject,
        text,
        html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
};

module.exports = {
    sendEmail,
};
