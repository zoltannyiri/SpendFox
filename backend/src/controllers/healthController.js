const { db } = require('../services/firestoreClient');

const getHealth = async (req, res) => {
  const hasFirestore = Boolean(db);
  res.json({ status: 'ok', firestore: hasFirestore });
};

module.exports = { getHealth };
