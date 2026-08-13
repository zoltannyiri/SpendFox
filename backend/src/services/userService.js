const { admin, db } = require('./firestoreClient');

const usersCollection = db.collection('users');
const subscriptionsCollection = db.collection('subscriptions');
const pushTokensCollection = db.collection('push_tokens');
const profileVisibilityValues = new Set(['public', 'friends', 'private']);

const toNumericId = (value) => {
  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && String(value).trim() !== '') {
    return numericValue;
  }

  return value;
};

const snapshotToUser = (doc) => ({
  id: Number(doc.id) || doc.id,
  ...doc.data(),
});

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

const isHttpUrl = (value) =>
  typeof value === 'string' &&
  (value.startsWith('http://') || value.startsWith('https://'));

const normalizeUsername = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const validateUsername = (value) => {
  const username = normalizeUsername(value);

  if (!username) {
    return { username: null, error: null };
  }

  if (username.length < 3) {
    return { username: null, error: { message: 'Username must be at least 3 characters long' } };
  }

  if (!/^[a-z][a-z0-9_]*$/.test(username)) {
    return {
      username: null,
      error: { message: 'Username must start with a letter and can only contain letters, numbers and underscores' },
    };
  }

  return { username, error: null };
};

const findUserByUsername = async (username) => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const byLowercaseSnapshot = await usersCollection
    .where('username_lower', '==', normalizedUsername)
    .limit(1)
    .get();

  if (!byLowercaseSnapshot.empty) {
    return byLowercaseSnapshot.docs[0];
  }

  const snapshot = await usersCollection.get();

  return snapshot.docs.find((doc) => {
    const data = doc.data();
    return normalizeUsername(data.username) === normalizedUsername;
  }) || null;
};

const ensureUsernameAvailable = async (username, currentUserId = null) => {
  const { username: normalizedUsername, error } = validateUsername(username);

  if (error || !normalizedUsername) {
    return { username: normalizedUsername, error };
  }

  const existingUser = await findUserByUsername(normalizedUsername);

  if (existingUser && String(existingUser.id) !== String(currentUserId)) {
    return { username: null, error: { message: 'Username is already taken' } };
  }

  return { username: normalizedUsername, error: null };
};

const listUsers = async (userId) => {
  try {
    let query = usersCollection;

    if (userId) {
      query = query.where('id', '==', toNumericId(userId));
    } else {
      query = query.orderBy('created_at', 'desc');
    }

    const snapshot = await query.get();
    const data = snapshot.docs
      .filter((doc) => doc.id !== '_schema')
      .map(snapshotToUser);

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

const getUserById = async (id) => {
  try {
    const isNumericLookup = !Number.isNaN(Number(id)) && String(id).trim() !== '';
    const doc = isNumericLookup
      ? await usersCollection.doc(String(id)).get()
      : await findUserByUsername(id);

    if (!doc?.exists) {
      return { data: null, error: { message: 'User not found' } };
    }

    return { data: snapshotToUser(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const getUserByUid = async (uid) => {
  try {
    const doc = await usersCollection.doc(String(uid)).get();

    if (!doc.exists) {
      return { data: null, error: { message: 'User not found' } };
    }

    return { data: snapshotToUser(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const updateUserByUid = async (uid, payload) => {
  try {
    const userId = String(uid);
    const docRef = usersCollection.doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { data: null, error: { message: 'User not found' } };
    }

    let normalizedUsername;

    if (payload.username !== undefined) {
      const availability = await ensureUsernameAvailable(payload.username, userId);

      if (availability.error) {
        return { data: null, error: availability.error };
      }

      normalizedUsername = availability.username;
    }

    if (
      payload.profile_visibility !== undefined &&
      !profileVisibilityValues.has(payload.profile_visibility)
    ) {
      return {
        data: null,
        error: { message: 'Invalid profile visibility' },
      };
    }

    const cleanPayload = Object.fromEntries(
      Object.entries({
        email: payload.email,
        full_name: payload.full_name,
        username: payload.username === undefined ? undefined : normalizedUsername,
        username_lower: payload.username === undefined ? undefined : normalizedUsername,
        avatar_url: payload.avatar_url,
        bio: payload.bio,
        location: payload.location,
        profile_slug: payload.profile_slug,
        public_profile_enabled: payload.public_profile_enabled,
        profile_visibility: payload.profile_visibility,
        notification_settings: payload.notification_settings,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }).filter(([, value]) => value !== undefined)
    );

    await docRef.update(cleanPayload);

    const authPayload = Object.fromEntries(
      Object.entries({
        email: payload.email,
        displayName: payload.full_name,
      }).filter(([, value]) => value !== undefined)
    );

    if (payload.avatar_url === null || isHttpUrl(payload.avatar_url)) {
      authPayload.photoURL = payload.avatar_url;
    }

    await admin.auth().updateUser(userId, authPayload);

    const updatedDoc = await docRef.get();

    return { data: snapshotToUser(updatedDoc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

const deleteUserById = async (id) => {
  try {
    const userId = String(id);
    const numericUserId = toNumericId(id);

    try {
      await admin.auth().deleteUser(userId);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    const subscriptionsSnapshot = await subscriptionsCollection
      .where('user_id', '==', numericUserId)
      .get();
    const pushTokensSnapshot = await pushTokensCollection
      .where('uid', '==', userId)
      .get();
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

    for (const doc of subscriptionsSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount += 1;
      await commitBatchIfNeeded();
    }

    for (const doc of pushTokensSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount += 1;
      await commitBatchIfNeeded();
    }

    batch.delete(usersCollection.doc(userId));
    operationCount += 1;

    if (operationCount > 0) {
      await batch.commit();
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  listUsers,
  getUserById,
  getUserByUid,
  updateUserByUid,
  deleteUserById,
  ensureUsernameAvailable,
  normalizeUsername,
};
