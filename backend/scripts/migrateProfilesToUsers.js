const { admin, db } = require('../src/services/firestoreClient');

const migrateProfilesToUsers = async () => {
  const profilesSnapshot = await db.collection('profiles').get();
  const batch = db.batch();
  let maxUserId = 0;
  let migratedCount = 0;

  profilesSnapshot.docs
    .filter((doc) => doc.id !== '_schema')
    .forEach((doc) => {
      const profile = doc.data();
      const appUserId = Number(profile.id || doc.id);
      const { uid, ...appUser } = profile;

      if (!Number.isNaN(appUserId)) {
        maxUserId = Math.max(maxUserId, appUserId);
      }

      batch.set(db.collection('users').doc(doc.id), appUser, { merge: true });
      migratedCount += 1;
    });

  batch.set(
    db.collection('users').doc('_schema'),
    {
      _kind: 'schema',
      collection: 'users',
      fields: {
        id: 'number',
        email: 'string',
        created_at: 'timestamp',
        updated_at: 'timestamp',
        full_name: 'string | null',
        username: 'string | null',
      },
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const usersCounterRef = db.collection('counters').doc('users');

  await db.runTransaction(async (transaction) => {
    const usersCounter = await transaction.get(usersCounterRef);
    const currentValue = usersCounter.exists ? usersCounter.data().value || 0 : 0;

    transaction.set(
      usersCounterRef,
      { value: Math.max(currentValue, maxUserId) },
      { merge: true }
    );
  });

  await batch.commit();

  console.log(`Migrated ${migratedCount} profile document(s) to users`);
};

migrateProfilesToUsers()
  .catch((err) => {
    console.error('Profile migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
