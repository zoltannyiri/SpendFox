require('dotenv').config();

const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
const port = process.env.PORT ? Number(process.env.PORT) : 5000;

if (!firebaseServiceAccountPath) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PATH from .env file');
}

console.log(`[env] FIREBASE_SERVICE_ACCOUNT_PATH loaded: ${firebaseServiceAccountPath}`);

module.exports = {
  firebaseServiceAccountPath,
  firebaseWebApiKey,
  port,
};
