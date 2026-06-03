const { db } = require('./firestoreClient');

const usersCollection = db.collection('users');

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
    const doc = await usersCollection.doc(String(id)).get();

    if (!doc.exists) {
      return { data: null, error: { message: 'User not found' } };
    }

    return { data: snapshotToUser(doc), error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  listUsers,
  getUserById,
};
