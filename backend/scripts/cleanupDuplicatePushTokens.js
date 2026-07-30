const crypto = require('crypto');
const { admin, db } = require('../src/services/firestoreClient');

const pushTokensCollection = db.collection('push_tokens');

const getTimestampMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value._seconds === 'number') {
    return value._seconds * 1000;
  }

  return new Date(value).getTime() || 0;
};

const getTokenKey = (data) => {
  if (data.token_hash) {
    return data.token_hash;
  }

  if (data.pushToken) {
    return crypto.createHash('sha256').update(data.pushToken).digest('hex');
  }

  return null;
};

const cleanupDuplicatePushTokens = async () => {
  const snapshot = await pushTokensCollection.get();
  const tokenGroups = new Map();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const tokenKey = getTokenKey(data);

    if (!tokenKey) {
      return;
    }

    const group = tokenGroups.get(tokenKey) || [];
    group.push({ doc, data });
    tokenGroups.set(tokenKey, group);
  });

  let deleted = 0;
  let normalized = 0;
  let batch = db.batch();
  let operationCount = 0;

  const commitBatchIfNeeded = async () => {
    if (operationCount < 450) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    operationCount = 0;
  };

  for (const [tokenHash, group] of tokenGroups.entries()) {
    const sortedGroup = group.sort(
      (a, b) =>
        getTimestampMillis(b.data.updated_at || b.data.created_at) -
        getTimestampMillis(a.data.updated_at || a.data.created_at)
    );
    const [latest, ...staleItems] = sortedGroup;

    if (!latest.data.token_hash) {
      batch.set(latest.doc.ref, { token_hash: tokenHash }, { merge: true });
      operationCount += 1;
      normalized += 1;
      await commitBatchIfNeeded();
    }

    for (const item of staleItems) {
      batch.delete(item.doc.ref);
      operationCount += 1;
      deleted += 1;
      await commitBatchIfNeeded();
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  console.log('Duplicate push token cleanup finished:');
  console.log(
    JSON.stringify(
      {
        tokenGroups: tokenGroups.size,
        normalized,
        deleted,
      },
      null,
      2
    )
  );
};

cleanupDuplicatePushTokens()
  .catch((err) => {
    console.error('Failed to cleanup duplicate push tokens:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
