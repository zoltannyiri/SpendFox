const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { getUserById } = require('./userService');
const { getSubscriptionShareAccess } = require('./subscriptionShareService');

const messagesCollection = db.collection('subscription_share_messages');

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
  status: err.status || 500,
});

const snapshotToMessage = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (value._seconds) return value._seconds * 1000;
  if (typeof value.toMillis === 'function') return value.toMillis();

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sanitizeSender = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    username: user.username,
    avatar_url: user.avatar_url,
    profile_slug: user.profile_slug,
  };
};

const enrichMessage = async (message) => {
  const senderResult = await getUserById(message.sender_id);

  return {
    ...message,
    sender: sanitizeSender(senderResult.data),
  };
};

const assertCanAccessShare = async (currentUserId, subscriptionId) => {
  const access = await getSubscriptionShareAccess(currentUserId, subscriptionId);

  if (!access.canAccess) {
    const error = new Error('You cannot access this shared subscription');
    error.status = 403;
    throw error;
  }

  return access;
};

const listSubscriptionShareMessages = async (currentUserId, subscriptionId) => {
  try {
    await assertCanAccessShare(currentUserId, subscriptionId);

    const snapshot = await messagesCollection
      .where('subscription_id', '==', String(subscriptionId))
      .get();
    const messages = await Promise.all(snapshot.docs.map((doc) => enrichMessage(snapshotToMessage(doc))));

    messages.sort((a, b) => timestampToMillis(a.created_at) - timestampToMillis(b.created_at));

    return { data: messages, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const createSubscriptionShareMessage = async (currentUserId, subscriptionId, body) => {
  try {
    await assertCanAccessShare(currentUserId, subscriptionId);

    const cleanBody = String(body || '').trim();

    if (!cleanBody) {
      return { data: null, error: { message: 'Message body is required', status: 400 } };
    }

    if (cleanBody.length > 1500) {
      return { data: null, error: { message: 'Message is too long', status: 400 } };
    }

    const id = await getNextId('subscription_share_messages');
    const ref = messagesCollection.doc(String(id));
    const message = {
      id,
      subscription_id: String(subscriptionId),
      sender_id: String(currentUserId),
      body: cleanBody,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(message);

    const createdDoc = await ref.get();

    return { data: await enrichMessage(snapshotToMessage(createdDoc)), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  createSubscriptionShareMessage,
  listSubscriptionShareMessages,
};
