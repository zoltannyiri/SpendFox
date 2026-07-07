const { sendEmail } = require('../services/emailService');
const { getUserByUid } = require('../services/userService');
const { buildSubscriptionEmail } = require('../templates/notifications/subscriptionEmailTemplate');

const sendTest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { to, subject, text, html } = req.body;
    const { data: user, error: userError } = await getUserByUid(uid);

    if (userError) {
      return res.status(404).json({ error: userError.message });
    }

    const recipient = to || user.email;
    const fallbackEmail = buildSubscriptionEmail({
      user,
      subscription: {
        id: 'test',
        name: 'Teszt előfizetés',
        price: 3990,
        currency: 'HUF',
      },
      daysBefore: 3,
    });

    const { data, error } = await sendEmail({
      to: recipient,
      subject: subject || fallbackEmail.subject,
      text: text || fallbackEmail.text,
      html: html || fallbackEmail.html,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  sendTest,
};
