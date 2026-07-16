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
    .map((subscription) => ({
      subscription,
      billingDate: getNextBillingDate(subscription, today),
    }))
    .filter((item) => item.billingDate)
    .sort((a, b) => a.billingDate.getTime() - b.billingDate.getTime());

  return reminders[0] || null;
};

module.exports = {
  formatDateOnly,
  getNextBillingDate,
  getNextSubscriptionReminder,
  parseDateOnly,
};
