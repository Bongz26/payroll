const { Resend } = require('resend');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const resendApiKey = process.env.SMTP_PASS; // Using the key you pasted in SMTP_PASS
const mailFrom = process.env.MAIL_FROM || 'onboarding@resend.dev';

const resend = new Resend(resendApiKey);

const sendEmail = async ({ to, subject, text, html }) => {
    if (!resendApiKey) {
        console.log('Email notifications are disabled because Resend API key is not configured.');
        return false;
    }

    const recipients = Array.isArray(to) ? to : [to];
    if (!recipients || recipients.length === 0) {
        console.log('No email recipients provided.');
        return false;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: mailFrom,
            to: recipients,
            subject,
            text: text || '',
            html: html || '',
        });

        if (error) {
            console.error('Resend API Error:', error);
            return false;
        }

        console.log(`Email sent via Resend API: ${data.id}`);
        return data;
    } catch (err) {
        console.error('Unexpected error while sending email:', err);
        return false;
    }
};

module.exports = {
    sendEmail,
};
