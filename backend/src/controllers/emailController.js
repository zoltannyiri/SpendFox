const { sendEmail } = require('../services/emailService');
const { getUserByUid } = require('../services/userService');
const { getNextNotificationPreview } = require('../services/subscriptionReminderService');
const { buildSubscriptionEmail } = require('../templates/notifications/subscriptionEmailTemplate');

const sendTest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { data: user, error: userError } = await getUserByUid(uid);

    if (userError) {
      return res.status(404).json({ error: userError.message });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const reminder = await getNextNotificationPreview(uid, user.notification_settings);

    if (!reminder) {
      return res.status(400).json({ error: 'No upcoming notification found for reminder' });
    }

    const email = buildSubscriptionEmail({
      user,
      subscription: reminder.subscription,
      daysBefore: reminder.daysBefore,
      billingDate: reminder.targetDate,
      reminderType: reminder.reminderType,
    });

    const { data, error } = await sendEmail({
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
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
