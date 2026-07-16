const { registerPushToken, sendPushToUser } = require('../services/pushTokenService');
const { getUserByUid } = require('../services/userService');
const { getNextSubscriptionReminder } = require('../services/subscriptionReminderService');
const { buildSubscriptionPushNotification } = require('../templates/notifications/subscriptionPushTemplate');

const getReminderDaysBefore = (user) =>
  Number(user?.notification_settings?.days_before) || 3;

const buildNextReminderMessage = async (uid) => {
  const { data: user, error: userError } = await getUserByUid(uid);

  if (userError) {
    return { error: userError };
  }

  const reminder = await getNextSubscriptionReminder(uid);

  if (!reminder) {
    return {
      error: { message: 'No active subscription found for reminder' },
    };
  }

  return {
    data: buildSubscriptionPushNotification({
      subscription: reminder.subscription,
      daysBefore: getReminderDaysBefore(user),
      billingDate: reminder.billingDate,
    }),
  };
};

const register = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { pushToken, platform } = req.body;

    const { data, error } = await registerPushToken({
      uid,
      pushToken,
      platform,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const sendTest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { data: message, error: messageError } = await buildNextReminderMessage(uid);

    if (messageError) {
      return res.status(400).json({ error: messageError.message });
    }

    const { data: result, error } = await sendPushToUser({
      uid,
      title: message.title,
      body: message.body,
      data: message.data,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const sendDelayedTest = async (req, res) => {
  try {
    const { uid } = req.auth;
    const { data: message, error: messageError } = await buildNextReminderMessage(uid);

    if (messageError) {
      return res.status(400).json({ error: messageError.message });
    }

    setTimeout(async () => {
      try {
        await sendPushToUser({
          uid,
          title: message.title,
          body: message.body,
          data: message.data,
        });
      } catch (err) {
        console.log('[push] delayed reminder failed:', err?.message || err);
      }
    }, 10 * 1000);

    return res.json({
      data: {
        scheduled: true,
        delay_seconds: 10,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  register,
  sendTest,
  sendDelayedTest,
};
