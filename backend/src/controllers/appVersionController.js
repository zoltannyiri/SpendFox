const { getAndroidAppVersion } = require('../services/appVersionService');
const { androidApkPath } = require('../config/env');

const getAndroidVersion = async (req, res) => {
  try {
    const { versionCode } = req.query;
    const { data, error } = await getAndroidAppVersion({
      currentVersionCode: versionCode,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

const downloadAndroidApk = async (req, res) => {
  try {
    return res.download(androidApkPath, 'spendfox.apk', (err) => {
      if (err && !res.headersSent) {
        return res.status(404).json({ error: 'APK file not found' });
      }

      return null;
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

module.exports = {
  getAndroidVersion,
  downloadAndroidApk,
};
