const nodemailer = require('nodemailer');

const {
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUser,
  smtpPass,
  smtpFromName,
  smtpFromEmail,
} = require('../config/env');

const isEmailConfigured = () => {
  return smtpHost && smtpPort && smtpUser && smtpPass && smtpFromEmail;
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    return {
      data: null,
      error: { message: 'Recipient email is required' },
    };
  }

  if (!isEmailConfigured()) {
    return {
      data: null,
      error: {
        message: 'Email provider is not configured. Missing SMTP env variables.',
      },
    };
  }

  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('[email] sent', {
      to,
      subject,
      messageId: info.messageId,
    });

    return {
      data: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      },
      error: null,
    };
  } catch (err) {
    console.error('[email] send failed', err);

    return {
      data: null,
      error: {
        message: err.message || 'Email sending failed',
      },
    };
  }
};

module.exports = {
  sendEmail,
};