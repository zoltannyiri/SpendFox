require('dotenv').config();

const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFromName = process.env.SMTP_FROM_NAME || 'SpendFox';
const smtpFromEmail = process.env.SMTP_FROM_EMAIL;

if (!firebaseServiceAccountPath) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PATH from .env file');
}

console.log(`[env] FIREBASE_SERVICE_ACCOUNT_PATH loaded: ${firebaseServiceAccountPath}`);
console.log(
  `[env] FIREBASE_WEB_API_KEY loaded: ${
    firebaseWebApiKey ? `yes (${firebaseWebApiKey.slice(0, 6)}..., length ${firebaseWebApiKey.length})` : 'no'
  }`
);

module.exports = {
  firebaseServiceAccountPath,
  firebaseWebApiKey,
  port,
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUser,
  smtpPass,
  smtpFromName,
  smtpFromEmail,
};
