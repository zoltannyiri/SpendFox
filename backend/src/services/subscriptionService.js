const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { convertPriceToHuf } = require('./exchangeRateService');
const { resolveBrandLogoUrl } = require('./brandLogoService');

const subscriptionsCollection = db.collection('subscriptions');

const cleanPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const toNumericId = (value) => {
  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && String(value).trim() !== '') {
    return numericValue;
  }

  return value;
};

const normalizeSubscriptionPayload = (payload) => ({
  ...payload,
  user_id: payload.user_id === undefined ? undefined : toNumericId(payload.user_id),
});

const snapshotToSubscription = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const resolveSubscriptionLogoUrl = (subscription) =>
  subscription.logo_url || resolveBrandLogoUrl(subscription.name);

const enrichSubscriptionWithHufPrice = async (subscription) => {
  if (
    subscription.price_huf !== undefined &&
    subscription.exchange_rate_to_huf !== undefined
  ) {
    return {
      ...subscription,
      logo_url: resolveSubscriptionLogoUrl(subscription),
    };
  }

  try {
    const conversion = await convertPriceToHuf(
      subscription.price,
      subscription.currency
    );

    return {
      ...subscription,
      ...conversion,
      logo_url: resolveSubscriptionLogoUrl(subscription),
    };
  } catch (err) {
    console.log('[exchange] failed to enrich subscription', {
      id: subscription.id,
      currency: subscription.currency,
      error: err.message,
    });

    return {
      ...subscription,
      price_huf: subscription.currency === 'HUF' ? Number(subscription.price) || 0 : null,
      exchange_rate_to_huf: subscription.currency === 'HUF' ? 1 : null,
      exchange_rate_date: null,
      logo_url: resolveSubscriptionLogoUrl(subscription),
    };
  }
};

const getTimestampMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  return new Date(value).getTime() || 0;
};

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const toPositiveInteger = (value, fallback) => {
  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  return fallback;
};

const getPriceInHuf = (subscription) => {
  const convertedPrice = Number(subscription.price_huf);

  if (!Number.isNaN(convertedPrice)) {
    return convertedPrice;
  }

  if ((subscription.currency || 'HUF') === 'HUF') {
    return Number(subscription.price) || 0;
  }

  return 0;
};

const buildSubscriptionsSummary = (subscriptions) =>
  subscriptions.reduce(
    (summary, subscription) => {
      if (subscription.is_active === false) {
        return summary;
      }

      const price = getPriceInHuf(subscription);
      const monthlyPrice =
        subscription.billing_cycle === 'yearly'
          ? price / 12
          : subscription.billing_cycle === 'weekly'
            ? price * 4
            : price;

      return {
        monthlyTotal: summary.monthlyTotal + monthlyPrice,
        yearlyTotal: summary.yearlyTotal + monthlyPrice * 12,
        activeCount: summary.activeCount + 1,
      };
    },
    {
      monthlyTotal: 0,
      yearlyTotal: 0,
      activeCount: 0,
    }
  );

const listSubscriptions = async (userId, options = {}) => {
  try {
    let query = subscriptionsCollection;
    const limit = toPositiveInteger(options.limit, null);
    const cursor = Math.max(Number(options.cursor) || 0, 0);
    const includeSummary = options.includeSummary === true;

    if (userId) {
      query = query.where('user_id', '==', toNumericId(userId));
    } else {
      query = query.orderBy('created_at', 'desc');
    }

    const snapshot = await query.get();
    const data = await Promise.all(snapshot.docs
      .filter((doc) => doc.id !== '_schema')
      .map(snapshotToSubscription)
      .map(enrichSubscriptionWithHufPrice));

    if (userId) {
      data.sort(
        (a, b) => getTimestampMillis(b.created_at) - getTimestampMillis(a.created_at)
      );
    }

    const pageData = limit ? data.slice(cursor, cursor + limit) : data;
    const nextCursor = limit && cursor + pageData.length < data.length
      ? String(cursor + pageData.length)
      : null;

    return {
      data: pageData,
      error: null,
      pagination: limit
        ? {
            limit,
            nextCursor,
            hasMore: Boolean(nextCursor),
            total: data.length,
          }
        : undefined,
      summary: includeSummary ? buildSubscriptionsSummary(data) : undefined,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const createSubscription = async (payload) => {
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const nextSubscriptionId = await getNextId('subscriptions');
    const docRef = subscriptionsCollection.doc(String(nextSubscriptionId));

    await docRef.set(
      cleanPayload({
        id: nextSubscriptionId,
        ...normalizeSubscriptionPayload(payload),
        created_at: now,
        updated_at: now,
      })
    );

    const doc = await docRef.get();

    return { data: snapshotToSubscription(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const deleteSubscription = async (id) => {
  try {
    await subscriptionsCollection.doc(id).delete();
    return { data: { id }, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const updateSubscription = async (id, payload) => {
  try {
    const docRef = subscriptionsCollection.doc(id);
    await docRef.update(
      cleanPayload({
        ...normalizeSubscriptionPayload(payload),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
    const doc = await docRef.get();

    return { data: snapshotToSubscription(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const getSubscriptionById = async (id) => {
  try {
    const doc = await subscriptionsCollection.doc(id).get();

    if (!doc.exists) {
      return { data: null, error: { message: 'Subscription not found' } };
    }

    return { data: snapshotToSubscription(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  listSubscriptions,
  getSubscriptionById,
  createSubscription,
  deleteSubscription,
  updateSubscription,
};
