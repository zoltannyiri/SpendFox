const { admin, db } = require('../src/services/firestoreClient');

const removeUserUidField = async () => {
  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  let updatedCount = 0;

  usersSnapshot.docs
    .filter((doc) => doc.id !== '_schema')
    .forEach((doc) => {
      batch.update(doc.ref, {
        uid: admin.firestore.FieldValue.delete(),
      });
      updatedCount += 1;
    });

  await batch.commit();

  console.log(`Removed uid field from ${updatedCount} user document(s)`);
};

removeUserUidField()
  .catch((err) => {
    console.error('User uid cleanup failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
