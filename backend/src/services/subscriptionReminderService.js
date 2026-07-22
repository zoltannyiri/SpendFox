const { db } = require('./firestoreClient');

const subscriptionsCollection = db.collection('subscriptions');

const toNumericId = (value) => {
  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && String(value).trim() !== '') {
    return numericValue;
  }

  return value;
};

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

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const createDateWithClampedDay = (year, month, day) => {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfMonth));
};

const addBillingCycle = (date, billingCycle) => {
  if (billingCycle === 'weekly') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  }

  if (billingCycle === 'yearly') {
    return createDateWithClampedDay(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }

  return createDateWithClampedDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
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

  return uniqueDays.length ? uniqueDays : [3];
};

const getNextBillingDate = (subscription, today = startOfDay(new Date())) => {
  const sourceDate = parseDateOnly(subscription.next_billing_date || subscription.start_date);

  if (!sourceDate) {
    return null;
  }

  let candidate = startOfDay(sourceDate);

  if (subscription.billing_cycle === 'monthly') {
    const paymentDay = candidate.getDate();
    candidate = createDateWithClampedDay(today.getFullYear(), today.getMonth(), paymentDay);

    if (candidate < today) {
      candidate = createDateWithClampedDay(
        today.getFullYear(),
        today.getMonth() + 1,
        paymentDay
      );
    }

    return candidate;
  }

  if (subscription.billing_cycle === 'yearly') {
    candidate = createDateWithClampedDay(
      today.getFullYear(),
      candidate.getMonth(),
      candidate.getDate()
    );

    if (candidate < today) {
      candidate = createDateWithClampedDay(
        today.getFullYear() + 1,
        candidate.getMonth(),
        candidate.getDate()
      );
    }

    return candidate;
  }

  if (subscription.billing_cycle === 'weekly') {
    while (candidate < today) {
      candidate = addBillingCycle(candidate, 'weekly');
    }
  }

  return candidate >= today ? candidate : null;
};

const getNextSubscriptionReminder = async (userId) => {
  const snapshot = await subscriptionsCollection
    .where('user_id', '==', toNumericId(userId))
    .where('is_active', '==', true)
    .get();

  const today = startOfDay(new Date());
  const reminders = snapshot.docs
    .filter((doc) => doc.id !== '_schema')
    .map((doc) => ({
      id: Number(doc.id) || doc.id,
      ...doc.data(),
    }))
    .flatMap((subscription) => [
      {
        subscription,
        billingDate: getNextBillingDate(subscription, today),
        reminderType: 'billing',
      },
      subscription.trial_enabled && subscription.trial_end_date
        ? {
            subscription,
            billingDate: parseDateOnly(subscription.trial_end_date),
            reminderType: 'trial',
          }
        : null,
    ])
    .filter((item) => item?.billingDate && item.billingDate >= today)
    .sort((a, b) => a.billingDate.getTime() - b.billingDate.getTime());

  return reminders[0] || null;
};

const getNextNotificationPreview = async (userId, notificationSettings = {}) => {
  const snapshot = await subscriptionsCollection
    .where('user_id', '==', toNumericId(userId))
    .where('is_active', '==', true)
    .get();

  const today = startOfDay(new Date());
  const reminderDays = normalizeReminderDays(notificationSettings);
  const notifications = snapshot.docs
    .filter((doc) => doc.id !== '_schema')
    .map((doc) => ({
      id: Number(doc.id) || doc.id,
      ...doc.data(),
    }))
    .flatMap((subscription) => [
      {
        subscription,
        reminderType: 'billing',
        targetDate: getNextBillingDate(subscription, today),
      },
      subscription.trial_enabled && subscription.trial_end_date
        ? {
            subscription,
            reminderType: 'trial',
            targetDate: parseDateOnly(subscription.trial_end_date),
          }
        : null,
    ])
    .filter((item) => item?.targetDate && item.targetDate >= today)
    .flatMap((item) =>
      reminderDays.map((daysBefore) => ({
        ...item,
        daysBefore,
        sendDate: addDays(item.targetDate, -daysBefore),
      }))
    )
    .filter((item) => item.sendDate >= today)
    .sort((a, b) => {
      const sendDateDiff = a.sendDate.getTime() - b.sendDate.getTime();

      if (sendDateDiff !== 0) {
        return sendDateDiff;
      }

      return a.targetDate.getTime() - b.targetDate.getTime();
    });

  const next = notifications[0];

  if (!next) {
    return null;
  }

  return {
    subscription: next.subscription,
    reminderType: next.reminderType,
    daysBefore: next.daysBefore,
    sendDate: formatDateOnly(next.sendDate),
    targetDate: formatDateOnly(next.targetDate),
  };
};

module.exports = {
  formatDateOnly,
  getNextBillingDate,
  getNextNotificationPreview,
  getNextSubscriptionReminder,
  parseDateOnly,
};
