const { db } = require('./firestoreClient');

const getNextId = async (name) => {
  const counterRef = db.collection('counters').doc(name);

  return db.runTransaction(async (transaction) => {
    const counter = await transaction.get(counterRef);
    const currentValue = counter.exists ? counter.data().value || 0 : 0;
    const nextValue = currentValue + 1;

    transaction.set(counterRef, { value: nextValue }, { merge: true });

    return nextValue;
  });
};

module.exports = {
  getNextId,
};
