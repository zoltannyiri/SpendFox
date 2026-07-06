const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    return {
      data: null,
      error: { message: 'Recipient email is required' },
    };
  }

  // Placeholder for a real provider integration, e.g. Resend, SendGrid or SMTP.
  console.log('[email] prepared notification', {
    to,
    subject,
    text,
    htmlLength: html?.length || 0,
  });

  return {
    data: {
      skipped: true,
      reason: 'Email provider is not configured yet',
    },
    error: null,
  };
};

module.exports = {
  sendEmail,
};
