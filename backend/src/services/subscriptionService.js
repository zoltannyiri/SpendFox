const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { convertPriceToHuf } = require('./exchangeRateService');

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

const enrichSubscriptionWithHufPrice = async (subscription) => {
  if (
    subscription.price_huf !== undefined &&
    subscription.exchange_rate_to_huf !== undefined
  ) {
    return subscription;
  }

  try {
    const conversion = await convertPriceToHuf(
      subscription.price,
      subscription.currency
    );

    return {
      ...subscription,
      ...conversion,
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

const listSubscriptions = async (userId) => {
  try {
    let query = subscriptionsCollection;

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

    return { data, error: null };
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
