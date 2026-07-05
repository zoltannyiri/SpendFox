const crypto = require('crypto');
const { admin, db } = require('./firestoreClient');

const pushTokensCollection = db.collection('push_tokens');

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const registerPushToken = async ({ uid, pushToken, platform }) => {
  try {
    if (!uid || !pushToken) {
      return {
        data: null,
        error: { message: 'uid and pushToken are required' },
      };
    }

    const tokenHash = crypto.createHash('sha256').update(pushToken).digest('hex');
    const docRef = pushTokensCollection.doc(`${uid}_${tokenHash}`);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await docRef.set(
      {
        uid: String(uid),
        pushToken,
        platform: platform || null,
        updated_at: now,
        created_at: now,
      },
      { merge: true }
    );

    const doc = await docRef.get();

    return { data: { id: doc.id, ...doc.data() }, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const sendPushToUser = async ({ uid, title, body, data }) => {
  try {
    if (!uid) {
      return {
        data: null,
        error: { message: 'uid is required' },
      };
    }

    const snapshot = await pushTokensCollection.where('uid', '==', String(uid)).get();
    const tokens = snapshot.docs
      .map((doc) => doc.data()?.pushToken)
      .filter(Boolean);

    if (tokens.length === 0) {
      return {
        data: { successCount: 0, failureCount: 0, message: 'No push tokens registered' },
        error: null,
      };
    }

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: title || 'SpendFox',
        body: body || 'Uj ertesites erkezett.',
      },
      data: data || {},
    });

    return {
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  registerPushToken,
  sendPushToUser,
};
