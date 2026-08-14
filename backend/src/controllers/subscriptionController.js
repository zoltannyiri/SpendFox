const {
  listSubscriptions,
  getSubscriptionById,
  createSubscription: createSubscriptionRecord,
  deleteSubscription: deleteSubscriptionRecord,
  updateSubscription: updateSubscriptionRecord,
  refreshUserExchangeRates,
} = require('../services/subscriptionService');
const { convertPriceToHuf } = require('../services/exchangeRateService');
const { resolveBrandLogoUrl } = require('../services/brandLogoService');
const {
  getSubscriptionShareAccess,
  inviteSubscriptionParticipant,
  listUserShareInvites,
  removeSubscriptionShareParticipant,
  respondToSubscriptionShareInvite,
  updateSubscriptionShareParticipant,
} = require('../services/subscriptionShareService');
const {
  createSubscriptionShareMessage,
  listSubscriptionShareMessages,
} = require('../services/subscriptionShareChatService');
const { createSubscriptionAutoActivity } = require('../services/profileActivityService');

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

const resolveNextBillingDate = ({
  nextBillingDate,
  startDate,
  billingCycle,
  trialEnabled,
  trialEndDate,
}) => {
  if (nextBillingDate) {
    return nextBillingDate;
  }

  if (trialEnabled && trialEndDate) {
    return trialEndDate;
  }

  return calculateNextBillingDate(startDate, billingCycle);
};

const buildPriceConversionFields = async (price, currency) => {
  try {
    return await convertPriceToHuf(price, currency);
  } catch (err) {
    return {
      error: {
        message: err.message || 'Exchange rate conversion failed',
      },
    };
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const {
      userId,
      limit,
      cursor,
      includeSummary,
      search,
      status,
      category,
      billingCycle,
    } = req.query;
    const { data, error, pagination, summary } = await listSubscriptions(userId, {
      limit,
      cursor,
      includeSummary: includeSummary === 'true',
      search,
      status,
      category,
      billingCycle,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      data,
      ...(pagination ? { pagination } : {}),
      ...(summary ? { summary } : {}),
    });
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
      category,
      trial_enabled,
      trial_end_date,
    } = req.body;

    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required' });
    }

    const calculatedNextBillingDate = resolveNextBillingDate({
      nextBillingDate: next_billing_date,
      startDate: start_date,
      billingCycle: billing_cycle,
      trialEnabled: trial_enabled,
      trialEndDate: trial_end_date,
    });
    const conversion = await buildPriceConversionFields(price, currency);

    if (conversion.error) {
      return res.status(502).json({ error: conversion.error.message });
    }

    const payload = {
      name,
      price,
      currency,
      ...conversion,
      billing_cycle,
      is_shared,
      user_id,
      next_billing_date: calculatedNextBillingDate || null,
      start_date,
      is_active,
      category,
      trial_enabled,
      trial_end_date,
      logo_url: resolveBrandLogoUrl(name),
    };

    const { data, error } = await createSubscriptionRecord(payload);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const activityType = data?.is_shared ? 'shared_subscription' : 'subscribed_subscription';
    createSubscriptionAutoActivity(data.user_id, data, activityType).catch((activityError) => {
      console.log('[feed] failed to create subscription activity', activityError);
    });

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const refreshExchangeRates = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const force = req.body?.force === true;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await refreshUserExchangeRates(userId, { force });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getSubscriptionShareInvites = async (req, res) => {
  try {
    const userId = req.auth?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await listUserShareInvites(userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const inviteSubscriptionShare = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { id } = req.params;
    const { receiver_id, share_price_huf } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    if (!receiver_id) {
      return res.status(400).json({ error: 'receiver_id is required' });
    }

    const { data, error } = await inviteSubscriptionParticipant(userId, id, receiver_id, {
      share_price_huf,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const updateSubscriptionShare = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { id, participantUserId } = req.params;
    const fields = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'share_price_huf')) {
      fields.share_price_huf = req.body.share_price_huf;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'settlement_status')) {
      fields.settlement_status = req.body.settlement_status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'settlement_note')) {
      fields.settlement_note = req.body.settlement_note;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await updateSubscriptionShareParticipant(userId, id, participantUserId, fields);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const removeSubscriptionShare = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { id, participantUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await removeSubscriptionShareParticipant(userId, id, participantUserId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getSubscriptionShareOverview = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const access = await getSubscriptionShareAccess(userId, id);

    if (!access.canAccess) {
      return res.status(403).json({ error: 'You cannot access this shared subscription' });
    }

    const { data, error } = await getSubscriptionById(id, userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      data: {
        subscription: data,
        role: access.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const respondToSubscriptionShare = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { inviteId, action } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await respondToSubscriptionShareInvite(userId, inviteId, action);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const getSubscriptionShareMessages = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await listSubscriptionShareMessages(userId, id);

    if (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const sendSubscriptionShareMessage = async (req, res) => {
  try {
    const userId = req.auth?.uid;
    const { id } = req.params;
    const { body, message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    const { data, error } = await createSubscriptionShareMessage(userId, id, body || message);

    if (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: currentSubscription } = await getSubscriptionById(id);
    const { data, error } = await deleteSubscriptionRecord(id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (currentSubscription?.user_id && currentSubscription.is_active !== false) {
      createSubscriptionAutoActivity(
        currentSubscription.user_id,
        currentSubscription,
        'cancelled_subscription'
      ).catch((activityError) => {
        console.log('[feed] failed to create subscription delete activity', activityError);
      });
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
      category,
      trial_enabled,
      trial_end_date,
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
    const resolvedPrice = price ?? currentSubscription.price;
    const resolvedCurrency = currency ?? currentSubscription.currency;
    const resolvedName = name ?? currentSubscription.name;
    const calculatedNextBillingDate = resolveNextBillingDate({
      nextBillingDate: next_billing_date,
      startDate: resolvedStartDate,
      billingCycle: resolvedBillingCycle,
      trialEnabled: trial_enabled ?? currentSubscription.trial_enabled,
      trialEndDate: trial_end_date ?? currentSubscription.trial_end_date,
    });
    const conversion = await buildPriceConversionFields(resolvedPrice, resolvedCurrency);

    if (conversion.error) {
      return res.status(502).json({ error: conversion.error.message });
    }

    const payload = {
      name,
      price,
      currency,
      ...conversion,
      billing_cycle,
      is_shared,
      user_id,
      start_date,
      next_billing_date: calculatedNextBillingDate,
      is_active,
      category,
      trial_enabled,
      trial_end_date,
      logo_url: resolveBrandLogoUrl(resolvedName),
    };

    const { data, error } = await updateSubscriptionRecord(id, payload);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (currentSubscription.is_active !== false && data?.is_active === false) {
      createSubscriptionAutoActivity(data.user_id, data, 'cancelled_subscription').catch((activityError) => {
        console.log('[feed] failed to create subscription cancellation activity', activityError);
      });
    } else if (currentSubscription.is_shared !== true && data?.is_shared === true) {
      createSubscriptionAutoActivity(data.user_id, data, 'shared_subscription').catch((activityError) => {
        console.log('[feed] failed to create shared subscription activity', activityError);
      });
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
  refreshExchangeRates,
  getSubscriptionShareInvites,
  inviteSubscriptionShare,
  removeSubscriptionShare,
  getSubscriptionShareOverview,
  respondToSubscriptionShare,
  getSubscriptionShareMessages,
  sendSubscriptionShareMessage,
  updateSubscriptionShare,
};
