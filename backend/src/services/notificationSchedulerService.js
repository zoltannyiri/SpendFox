const { db } = require('./firestoreClient');
const { sendPushToUser } = require('./pushTokenService');
const { sendEmail } = require('./emailService');
const { buildSubscriptionPushNotification } = require('../templates/notifications/subscriptionPushTemplate');
const { buildSubscriptionEmail } = require('../templates/notifications/subscriptionEmailTemplate');

const usersCollection = db.collection('users');
const subscriptionsCollection = db.collection('subscriptions');
const notificationLogsCollection = db.collection('notification_logs');

const DEFAULT_DAYS_BEFORE = 3;
const NOTIFICATION_HOUR = 10;

let schedulerInterval = null;
let lastRunDate = null;

const parseDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && typeof value._seconds === 'number') {
    return new Date(value._seconds * 1000);
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const normalizeReminderDays = (notificationSettings) => {
  const values = Array.isArray(notificationSettings?.days_before_list)
    ? notificationSettings.days_before_list
    : [notificationSettings?.days_before];
  const days = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const uniqueDays = [...new Set(days)].sort((a, b) => a - b);

  return uniqueDays.length ? uniqueDays : [DEFAULT_DAYS_BEFORE];
};

const getNotificationSettings = (user) => ({
  push_enabled: Boolean(user?.notification_settings?.push_enabled),
  email_enabled: Boolean(user?.notification_settings?.email_enabled),
  reminder_days: normalizeReminderDays(user?.notification_settings),
});

const wasSent = async ({ userId, subscriptionId, targetDate, channel, daysBefore }) => {
  const docId = `${userId}_${subscriptionId}_${targetDate}_${daysBefore}_${channel}`;
  const doc = await notificationLogsCollection.doc(docId).get();

  return doc.exists;
};

const markSent = async ({ userId, subscriptionId, targetDate, channel, daysBefore }) => {
  const docId = `${userId}_${subscriptionId}_${targetDate}_${daysBefore}_${channel}`;

  await notificationLogsCollection.doc(docId).set({
    user_id: userId,
    subscription_id: subscriptionId,
    target_date: targetDate,
    days_before: daysBefore,
    channel,
    sent_at: new Date().toISOString(),
  });
};

const getMatchingReminderDaysBefore = ({ today, nextBillingDate, reminderDays }) => {
  const targetDate = formatDateOnly(nextBillingDate);

  return reminderDays.find((daysBefore) =>
    formatDateOnly(addDays(today, daysBefore)) === targetDate
  );
};

const sendDueSubscriptionNotifications = async (now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const usersSnapshot = await usersCollection.get();

  for (const userDoc of usersSnapshot.docs) {
    if (userDoc.id === '_schema') {
      continue;
    }

    const user = { id: Number(userDoc.id) || userDoc.id, ...userDoc.data() };
    const settings = getNotificationSettings(user);

    if (!settings.push_enabled && !settings.email_enabled) {
      continue;
    }

    const subscriptionsSnapshot = await subscriptionsCollection
      .where('user_id', '==', user.id)
      .where('is_active', '==', true)
      .get();

    for (const subscriptionDoc of subscriptionsSnapshot.docs) {
      const subscription = {
        id: Number(subscriptionDoc.id) || subscriptionDoc.id,
        ...subscriptionDoc.data(),
      };
      const nextBillingDate = parseDateOnly(subscription.next_billing_date);
      const daysBefore = nextBillingDate
        ? getMatchingReminderDaysBefore({
            today,
            nextBillingDate,
            reminderDays: settings.reminder_days,
          })
        : null;

      if (!nextBillingDate || !daysBefore) {
        continue;
      }

      if (settings.push_enabled) {
        const targetDate = formatDateOnly(nextBillingDate);
        const alreadySent = await wasSent({
          userId: user.id,
          subscriptionId: subscription.id,
          targetDate,
          daysBefore,
          channel: 'push',
        });

        if (!alreadySent) {
          const message = buildSubscriptionPushNotification({
            subscription,
            daysBefore,
            billingDate: nextBillingDate,
          });

          await sendPushToUser({
            uid: user.id,
            title: message.title,
            body: message.body,
            data: message.data,
          });
          await markSent({
            userId: user.id,
            subscriptionId: subscription.id,
            targetDate,
            daysBefore,
            channel: 'push',
          });
        }
      }

      if (settings.email_enabled) {
        const targetDate = formatDateOnly(nextBillingDate);
        const alreadySent = await wasSent({
          userId: user.id,
          subscriptionId: subscription.id,
          targetDate,
          daysBefore,
          channel: 'email',
        });

        if (!alreadySent) {
          const email = buildSubscriptionEmail({
            user,
            subscription,
            daysBefore,
            billingDate: nextBillingDate,
          });

          await sendEmail({
            to: user.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
          await markSent({
            userId: user.id,
            subscriptionId: subscription.id,
            targetDate,
            daysBefore,
            channel: 'email',
          });
        }
      }
    }
  }
};

const shouldRun = (now) => {
  const today = formatDateOnly(now);

  return now.getHours() === NOTIFICATION_HOUR && lastRunDate !== today;
};

const startNotificationScheduler = () => {
  if (schedulerInterval) {
    return;
  }

  schedulerInterval = setInterval(async () => {
    const now = new Date();

    if (!shouldRun(now)) {
      return;
    }

    lastRunDate = formatDateOnly(now);

    try {
      await sendDueSubscriptionNotifications(now);
    } catch (err) {
      console.log('[notifications] scheduler failed:', err?.message || err);
    }
  }, 60 * 1000);

  console.log('[notifications] scheduler started');
};

module.exports = {
  sendDueSubscriptionNotifications,
  startNotificationScheduler,
};
