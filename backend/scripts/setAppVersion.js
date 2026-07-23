const { admin, db } = require('../src/services/firestoreClient');

const DEFAULT_APK_URL = '/app-version/android/apk';
const DEFAULT_MESSAGE = 'Új SpendFox verzió érhető el.';

const parseArgs = (argv) => {
  const args = argv.slice(2);
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current.startsWith('--')) {
      const key = current.slice(2);
      const next = args[index + 1];

      if (!next || next.startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = next;
        index += 1;
      }
    } else if (!options.versionCode) {
      options.versionCode = current;
    } else if (!options.versionName) {
      options.versionName = current;
    }
  }

  return options;
};

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined) {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'igen'].includes(String(value).toLowerCase());
};

const setAppVersion = async () => {
  const options = parseArgs(process.argv);
  const versionCode = Number(options.versionCode);
  const versionName = options.versionName ? String(options.versionName) : null;

  if (!Number.isInteger(versionCode) || versionCode <= 0 || !versionName) {
    console.error('Usage: node scripts/setAppVersion.js <versionCode> <versionName> [--force true] [--message "..."]');
    console.error('Example: node scripts/setAppVersion.js 2 1.1');
    process.exitCode = 1;
    return;
  }

  const payload = {
    platform: 'android',
    version_code: versionCode,
    version_name: versionName,
    apk_url: options.apkUrl || DEFAULT_APK_URL,
    download_url: options.downloadUrl || options.apkUrl || DEFAULT_APK_URL,
    force_update: toBoolean(options.force, false),
    message: options.message || DEFAULT_MESSAGE,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('app_versions').doc('android').set(payload, { merge: true });

  console.log('Android app version updated:');
  console.log(JSON.stringify({ ...payload, updated_at: 'serverTimestamp()' }, null, 2));
};

setAppVersion()
  .catch((err) => {
    console.error('Failed to update Android app version:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });
