const { db } = require('./firestoreClient');

const allowedDictionaries = ['currency', 'country', 'billing-cycle'];

const toServiceError = (err) => ({
  message: err.message || 'Firestore operation failed',
});

const snapshotToDictionaryItem = (doc) => doc.data();

const listDictionaryItems = async (type) => {
  try {
    if (!allowedDictionaries.includes(type)) {
      return {
        data: null,
        error: { message: `Unknown dictionary type: ${type}` },
      };
    }

    const snapshot = await db
      .collection('dictionary')
      .doc(type)
      .collection('items')
      .get();

    const data = snapshot.docs
      .filter((doc) => doc.id !== '_schema')
      .map(snapshotToDictionaryItem);

    return { data, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  allowedDictionaries,
  listDictionaryItems,
};
