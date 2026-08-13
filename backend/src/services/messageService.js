const { admin, db } = require('./firestoreClient');
const { getNextId } = require('./counterService');

const usersCollection = db.collection('users');
const friendsCollection = db.collection('friends');
const conversationsCollection = db.collection('conversations');
const messagesCollection = db.collection('messages');

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const snapshotToUser = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const snapshotToMessage = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

const getPairKey = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join('_');

const getUserOrThrow = async (id) => {
  const doc = await usersCollection.doc(String(id)).get();

  if (!doc.exists) {
    throw new Error('User not found');
  }

  return snapshotToUser(doc);
};

const ensureFriends = async (currentUserId, otherUserId) => {
  const pairKey = getPairKey(currentUserId, otherUserId);
  const doc = await friendsCollection.doc(pairKey).get();

  if (!doc.exists) {
    throw new Error('You can only message friends');
  }

  return pairKey;
};

const getMessagesWithUser = async (currentUserId, otherUserId) => {
  try {
    const normalizedCurrentUserId = String(currentUserId);
    const normalizedOtherUserId = String(otherUserId);
    const [otherUser, conversationId] = await Promise.all([
      getUserOrThrow(normalizedOtherUserId),
      ensureFriends(normalizedCurrentUserId, normalizedOtherUserId),
    ]);

    const snapshot = await messagesCollection
      .where('conversation_id', '==', conversationId)
      .get();
    const messages = snapshot.docs
      .map(snapshotToMessage)
      .sort((firstMessage, secondMessage) => {
        const firstTime = firstMessage.created_at?._seconds || 0;
        const secondTime = secondMessage.created_at?._seconds || 0;

        return firstTime - secondTime;
      });

    return {
      data: {
        conversation_id: conversationId,
        participant: otherUser,
        messages,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const sendMessage = async (senderId, receiverId, body) => {
  try {
    const normalizedSenderId = String(senderId);
    const normalizedReceiverId = String(receiverId);
    const cleanBody = String(body || '').trim();

    if (!cleanBody) {
      return { data: null, error: { message: 'Message body is required' } };
    }

    if (normalizedSenderId === normalizedReceiverId) {
      return { data: null, error: { message: 'You cannot message yourself' } };
    }

    const [receiver, conversationId] = await Promise.all([
      getUserOrThrow(normalizedReceiverId),
      ensureFriends(normalizedSenderId, normalizedReceiverId),
    ]);
    const id = await getNextId('messages');
    const messageRef = messagesCollection.doc(String(id));
    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload = {
      id,
      conversation_id: conversationId,
      sender_id: normalizedSenderId,
      receiver_id: normalizedReceiverId,
      body: cleanBody,
      read_at: null,
      created_at: now,
      updated_at: now,
    };

    await db.runTransaction(async (transaction) => {
      transaction.set(messageRef, payload);
      transaction.set(
        conversationsCollection.doc(conversationId),
        {
          id: conversationId,
          participant_ids: [normalizedSenderId, normalizedReceiverId],
          last_message: cleanBody,
          last_message_sender_id: normalizedSenderId,
          last_message_at: now,
          updated_at: now,
        },
        { merge: true }
      );
    });

    const doc = await messageRef.get();

    return {
      data: {
        message: snapshotToMessage(doc),
        participant: receiver,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  getMessagesWithUser,
  sendMessage,
};
