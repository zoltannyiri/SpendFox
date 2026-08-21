const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');
const { getUserById } = require('./userService');
const { getSubscriptionShareAccess } = require('./subscriptionShareService');
const { sendPushToUser } = require('./pushTokenService');

const messagesCollection = db.collection('subscription_share_messages');
const subscriptionsCollection = db.collection('subscriptions');
const shareInvitesCollection = db.collection('subscription_share_invites');

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
    const enrichedMessage = await enrichMessage(snapshotToMessage(createdDoc));

    notifyShareMessageReceivers({
      currentUserId,
      subscriptionId,
      message: enrichedMessage,
    }).catch((err) => {
      console.log('[push] failed to send shared chat notification:', err?.message || err);
    });

    return { data: enrichedMessage, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const notifyShareMessageReceivers = async ({ currentUserId, subscriptionId, message }) => {
  const subscriptionDoc = await subscriptionsCollection.doc(String(subscriptionId)).get();

  if (!subscriptionDoc.exists) {
    return;
  }

  const subscription = {
    id: Number(subscriptionDoc.id) || subscriptionDoc.id,
    ...subscriptionDoc.data(),
  };
  const inviteSnapshot = await shareInvitesCollection
    .where('subscription_id', '==', String(subscriptionId))
    .get();
  const receiverIds = new Set();

  if (String(subscription.user_id) !== String(currentUserId)) {
    receiverIds.add(String(subscription.user_id));
  }

  inviteSnapshot.docs.forEach((doc) => {
    const invite = doc.data();

    if (invite.status === 'accepted' && String(invite.receiver_id) !== String(currentUserId)) {
      receiverIds.add(String(invite.receiver_id));
    }
  });

  if (receiverIds.size === 0) {
    console.log('[push] shared chat skipped: no receivers', {
      subscriptionId: String(subscriptionId),
      senderId: String(currentUserId),
    });
    return;
  }

  const senderName =
    message?.sender?.full_name ||
    message?.sender?.username ||
    message?.sender?.email ||
    'Valaki';
  const body = String(message?.body || '').slice(0, 120);

  const results = await Promise.allSettled(
    [...receiverIds].map((uid) =>
      sendPushToUser({
        uid,
        title: `Új üzenet: ${subscription.name || 'közös előfizetés'}`,
        body: `${senderName}: ${body}`,
        data: {
          type: 'subscription_share_message',
          subscriptionId: String(subscriptionId),
        },
      })
    )
  );

  console.log('[push] shared chat notification sent', {
    subscriptionId: String(subscriptionId),
    senderId: String(currentUserId),
    receiverIds: [...receiverIds],
    results: results.map((result) =>
      result.status === 'fulfilled'
        ? result.value?.data || null
        : { error: result.reason?.message || String(result.reason) }
    ),
  });
};

module.exports = {
  createSubscriptionShareMessage,
  listSubscriptionShareMessages,
};
