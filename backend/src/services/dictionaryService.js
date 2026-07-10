const { db } = require('./firestoreClient');

const allowedDictionaries = ['currency', 'country', 'billing-cycle', 'subscription-category'];

const fallbackDictionaryItems = {
  'subscription-category': [
    { code: 'streaming', name: 'Streaming' },
    { code: 'work', name: 'Munka' },
    { code: 'ai-tool', name: 'AI tool' },
    { code: 'hosting', name: 'Tárhely' },
    { code: 'mobile', name: 'Mobil' },
    { code: 'bank', name: 'Bank' },
    { code: 'gaming', name: 'Játék' },
    { code: 'other', name: 'Egyéb' },
  ],
};

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

    return {
      data: data.length > 0 ? data : fallbackDictionaryItems[type] || [],
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  allowedDictionaries,
  listDictionaryItems,
};
