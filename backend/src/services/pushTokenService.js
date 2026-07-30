const crypto = require('crypto');
const { admin, db } = require('./firestoreClient');

const pushTokensCollection = db.collection('push_tokens');

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const normalizeDataPayload = (data) =>
  Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [key, String(value ?? '')])
  );

const removeTokenFromOtherUsers = async ({ uid, pushToken, tokenHash }) => {
  const normalizedUid = String(uid);
  const byPushTokenSnapshot = await pushTokensCollection
    .where('pushToken', '==', pushToken)
    .get();
  const byTokenHashSnapshot = await pushTokensCollection
    .where('token_hash', '==', tokenHash)
    .get();
  const docsById = new Map();

  for (const doc of [...byPushTokenSnapshot.docs, ...byTokenHashSnapshot.docs]) {
    docsById.set(doc.id, doc);
  }

  const staleDocs = [...docsById.values()].filter((doc) => {
    const data = doc.data();

    return String(data?.uid || '') !== normalizedUid;
  });

  if (staleDocs.length === 0) {
    return;
  }

  const batch = db.batch();

  staleDocs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

const registerPushToken = async ({ uid, pushToken, platform, appVersionCode, appVersionName }) => {
  try {
    if (!uid || !pushToken) {
      return {
        data: null,
        error: { message: 'uid and pushToken are required' },
      };
    }

    const tokenHash = crypto.createHash('sha256').update(pushToken).digest('hex');
    await removeTokenFromOtherUsers({ uid, pushToken, tokenHash });

    const docRef = pushTokensCollection.doc(`${uid}_${tokenHash}`);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await docRef.set(
      {
        uid: String(uid),
        pushToken,
        token_hash: tokenHash,
        platform: platform || null,
        app_version_code: appVersionCode ? Number(appVersionCode) : null,
        app_version_name: appVersionName || null,
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
        body: body || 'Új értesítés érkezett.',
      },
      data: normalizeDataPayload(data),
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
