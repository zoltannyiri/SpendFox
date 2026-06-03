const { admin, db } = require('../src/services/firestoreClient');

const schemaUpdatedAt = admin.firestore.FieldValue.serverTimestamp();

const schemas = {
  counters: {
    value: 'number',
  },
  users: {
    id: 'number',
    email: 'string',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    full_name: 'string | null',
    username: 'string | null',
  },
  subscriptions: {
    id: 'number',
    name: 'string',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    price: 'number',
    currency: 'string',
    billing_cycle: 'string',
    is_shared: 'boolean',
    user_id: 'number',
    next_billing_date: 'string date',
  },
};

const initFirestore = async () => {
  const batch = db.batch();

  for (const [collectionName, fields] of Object.entries(schemas)) {
    const schemaRef = db.collection(collectionName).doc('_schema');

    batch.set(
      schemaRef,
      {
        _kind: 'schema',
        collection: collectionName,
        fields,
        updated_at: schemaUpdatedAt,
      },
      { merge: true }
    );
  }

  await batch.commit();

  await Promise.all(
    ['users', 'subscriptions'].map(async (name) => {
      const counterRef = db.collection('counters').doc(name);
      const counter = await counterRef.get();

      if (!counter.exists) {
        await counterRef.set({ value: 0 });
      }
    })
  );

  console.log('Firestore collections initialized: counters, users, subscriptions');
};

initFirestore()
  .catch((err) => {
    console.error('Firestore initialization failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
