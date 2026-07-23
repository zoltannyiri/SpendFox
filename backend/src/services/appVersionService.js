const { db } = require('./firestoreClient');
const {
  androidVersionCode,
  androidVersionName,
  androidDownloadUrl,
  androidApkUrl,
  androidForceUpdate,
} = require('../config/env');

const appVersionsCollection = db.collection('app_versions');

const DRIVE_DOWNLOAD_URL =
  'https://drive.google.com/drive/folders/1pYLNU5Z3k7BuiY06aWqeibMJRP_oo14C?usp=sharing';

const toServiceError = (err) => ({
  message: err.message || 'App version operation failed',
});

const normalizeVersion = (data = {}) => ({
  platform: 'android',
  versionCode: Number(data.version_code ?? data.versionCode ?? androidVersionCode),
  versionName: String(data.version_name ?? data.versionName ?? androidVersionName),
  apkUrl: data.apk_url ?? data.apkUrl ?? androidApkUrl ?? '/app-version/android/apk',
  downloadUrl: data.download_url ?? data.downloadUrl ?? androidDownloadUrl ?? DRIVE_DOWNLOAD_URL,
  forceUpdate: Boolean(data.force_update ?? data.forceUpdate ?? androidForceUpdate),
  message: data.message || 'Új SpendFox verzió érhető el.',
  changelog: Array.isArray(data.changelog) ? data.changelog : [],
});

const getAndroidAppVersion = async ({ currentVersionCode } = {}) => {
  try {
    const snapshot = await appVersionsCollection.doc('android').get();
    const version = normalizeVersion(snapshot.exists ? snapshot.data() : {});
    const currentCode = Number(currentVersionCode || 0);

    return {
      data: {
        ...version,
        updateAvailable: currentCode > 0 ? version.versionCode > currentCode : false,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

module.exports = {
  getAndroidAppVersion,
};
