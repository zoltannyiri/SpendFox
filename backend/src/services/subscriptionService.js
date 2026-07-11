const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { convertPriceToHuf } = require('./exchangeRateService');
const { resolveBrandLogoUrl } = require('./brandLogoService');

const subscriptionsCollection = db.collection('subscriptions');
const exchangeRefreshCollection = db.collection('exchange_rate_refreshes');
const TARGET_CURRENCY = 'HUF';

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

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const filterSubscriptions = (subscriptions, options) => {
  const search = normalizeText(options.search);
  const status = options.status || 'all';
  const category = options.category || 'all';
  const billingCycle = options.billingCycle || 'all';

  return subscriptions.filter((subscription) => {
    if (search && !normalizeText(subscription.name).includes(search)) {
      return false;
    }

    if (status === 'active' && subscription.is_active === false) {
      return false;
    }

    if (status === 'inactive' && subscription.is_active !== false) {
      return false;
    }

    if (category !== 'all' && (subscription.category || 'other') !== category) {
      return false;
    }

    if (billingCycle !== 'all' && subscription.billing_cycle !== billingCycle) {
      return false;
    }

    return true;
  });
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

const getTodayKey = () => new Date().toISOString().slice(0, 10);

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

    const filteredData = filterSubscriptions(data, options);
    const pageData = limit
      ? filteredData.slice(cursor, cursor + limit)
      : filteredData;
    const nextCursor = limit && cursor + pageData.length < filteredData.length
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
            total: filteredData.length,
          }
        : undefined,
      summary: includeSummary ? buildSubscriptionsSummary(filteredData) : undefined,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const refreshUserExchangeRates = async (userId, options = {}) => {
  try {
    const normalizedUserId = toNumericId(userId);
    const todayKey = getTodayKey();
    const refreshRef = exchangeRefreshCollection.doc(String(normalizedUserId));
    const refreshDoc = await refreshRef.get();
    const refreshData = refreshDoc.exists ? refreshDoc.data() : null;

    if (!options.force && refreshData?.last_refresh_date === todayKey) {
      return {
        data: {
          skipped: true,
          refreshed: 0,
          failed: 0,
          last_refresh_date: todayKey,
        },
        error: null,
      };
    }

    const snapshot = await subscriptionsCollection
      .where('user_id', '==', normalizedUserId)
      .get();

    let refreshed = 0;
    let failed = 0;
    let batch = db.batch();
    let batchOperationCount = 0;
    const commitBatchIfNeeded = async () => {
      if (batchOperationCount < 450) {
        return;
      }

      await batch.commit();
      batch = db.batch();
      batchOperationCount = 0;
    };

    for (const doc of snapshot.docs) {
      if (doc.id === '_schema') {
        continue;
      }

      const subscription = snapshotToSubscription(doc);
      const currency = String(subscription.currency || TARGET_CURRENCY).toUpperCase();

      if (currency === TARGET_CURRENCY) {
        batch.update(doc.ref, {
          price_huf: Number(subscription.price) || 0,
          exchange_rate_to_huf: 1,
          exchange_rate_date: todayKey,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOperationCount += 1;
        refreshed += 1;
        await commitBatchIfNeeded();
        continue;
      }

      try {
        const conversion = await convertPriceToHuf(subscription.price, currency);

        batch.update(doc.ref, {
          ...conversion,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOperationCount += 1;
        refreshed += 1;
        await commitBatchIfNeeded();
      } catch (err) {
        failed += 1;
        console.log('[exchange] failed to refresh subscription rate', {
          id: subscription.id,
          currency,
          error: err.message,
        });
      }
    }

    batch.set(
      refreshRef,
      {
        user_id: normalizedUserId,
        last_refresh_date: todayKey,
        refreshed,
        failed,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    batchOperationCount += 1;

    if (batchOperationCount > 0) {
      await batch.commit();
    }

    return {
      data: {
        skipped: false,
        refreshed,
        failed,
        last_refresh_date: todayKey,
      },
      error: null,
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
  refreshUserExchangeRates,
};
