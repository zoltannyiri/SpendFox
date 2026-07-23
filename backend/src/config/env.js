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
const androidVersionCode = process.env.APP_ANDROID_VERSION_CODE
  ? Number(process.env.APP_ANDROID_VERSION_CODE)
  : 1;
const androidVersionName = process.env.APP_ANDROID_VERSION_NAME || '1.0';
const androidDownloadUrl =
  process.env.APP_ANDROID_DOWNLOAD_URL ||
  'https://drive.google.com/drive/folders/1pYLNU5Z3k7BuiY06aWqeibMJRP_oo14C?usp=sharing';
const androidApkUrl = process.env.APP_ANDROID_APK_URL || null;
const androidApkPath = process.env.APP_ANDROID_APK_PATH || '/root/spendfox/releases/app-release.apk';
const androidForceUpdate = process.env.APP_ANDROID_FORCE_UPDATE === 'true';

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
  androidVersionCode,
  androidVersionName,
  androidDownloadUrl,
  androidApkUrl,
  androidApkPath,
  androidForceUpdate,
};
