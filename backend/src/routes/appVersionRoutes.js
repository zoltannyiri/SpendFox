const express = require('express');
const { getAndroidVersion, downloadAndroidApk } = require('../controllers/appVersionController');

const router = express.Router();

router.get('/app-version/android', getAndroidVersion);
router.get('/app-version/android/apk', downloadAndroidApk);

module.exports = router;
