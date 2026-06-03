const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { firebaseServiceAccountPath } = require('../config/env');

const resolvedPath = path.resolve(firebaseServiceAccountPath);
const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = {
  admin,
  db,
};
