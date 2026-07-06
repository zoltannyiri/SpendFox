const {listSubscriptions, getSubscriptionById, createSubscription: createSubscriptionRecord, 
    deleteSubscription: deleteSubscriptionRecord, updateSubscription: updateSubscriptionRecord} = require('../services/subscriptionService');

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
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

const createDateWithClampedDay = (year, month, day) => {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfMonth));
};

const calculateNextBillingDate = (startDateValue, billingCycle) => {
  if (!startDateValue || !billingCycle) {
    return undefined;
  }

  const startDate = parseDateOnly(startDateValue);

  if (!startDate) {
    return undefined;
  }

  let nextDate;

  if (billingCycle === 'monthly') {
    nextDate = createDateWithClampedDay(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      startDate.getDate()
    );
  } else if (billingCycle === 'yearly') {
    nextDate = createDateWithClampedDay(
      startDate.getFullYear() + 1,
      startDate.getMonth(),
      startDate.getDate()
    );
  } else if (billingCycle === 'weekly') {
    nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + 7);
  }

  return nextDate ? formatDateOnly(nextDate) : undefined;
};

const getSubscriptions = async (req, res) => {
  try {
    const { userId } = req.query;
    const { data, error } = await listSubscriptions(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getSubscriptionById(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const createSubscription = async (req, res) => {
  try {
    const {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      start_date,
      next_billing_date,
      is_active,
    } = req.body;

    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required' });
    }

    const calculatedNextBillingDate =
      next_billing_date || calculateNextBillingDate(start_date, billing_cycle);

    const payload = {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      next_billing_date: calculatedNextBillingDate || null,
      start_date,
      is_active,
    };

    const { data, error } = await createSubscriptionRecord(payload);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await deleteSubscriptionRecord(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: `Subscription with ID ${id} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      start_date,
      next_billing_date,
      is_active,
    } = req.body;

    const { data: currentSubscription, error: getError } = await getSubscriptionById(id);

    if (getError) {
      return res.status(500).json({ error: getError.message });
    }

    if (!currentSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const resolvedStartDate =
      start_date ?? currentSubscription.start_date ?? currentSubscription.next_billing_date;
    const resolvedBillingCycle = billing_cycle ?? currentSubscription.billing_cycle;
    const calculatedNextBillingDate =
      resolvedStartDate && resolvedBillingCycle
        ? calculateNextBillingDate(resolvedStartDate, resolvedBillingCycle)
        : next_billing_date;

    const payload = {
      name,
      price,
      currency,
      billing_cycle,
      is_shared,
      user_id,
      start_date,
      next_billing_date: calculatedNextBillingDate,
      is_active,
    };

    const { data, error } = await updateSubscriptionRecord(id, payload);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getSubscriptions,
  getSubscription,
  createSubscription,
  deleteSubscription,
  updateSubscription,
};
