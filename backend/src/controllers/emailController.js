const { sendEmail } = require('../services/emailService');
const { getUserByUid } = require('../services/userService');
const { getNextSubscriptionReminder } = require('../services/subscriptionReminderService');
const { buildSubscriptionEmail } = require('../templates/notifications/subscriptionEmailTemplate');

const getReminderDaysBefore = (user) => {
  const values = Array.isArray(user?.notification_settings?.days_before_list)
    ? user.notification_settings.days_before_list
    : [user?.notification_settings?.days_before];
  const days = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);

  return days[0] || 3;
};

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

    const reminder = await getNextSubscriptionReminder(uid);

    if (!reminder) {
      return res.status(400).json({ error: 'No active subscription found for reminder' });
    }

    const email = buildSubscriptionEmail({
      user,
      subscription: reminder.subscription,
      daysBefore: getReminderDaysBefore(user),
      billingDate: reminder.billingDate,
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
