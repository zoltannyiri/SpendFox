const { admin, db } = require('./firestoreClient');
const { getAndroidAppVersion } = require('./appVersionService');

const pushTokensCollection = db.collection('push_tokens');
const notificationLogsCollection = db.collection('notification_logs');

const getUpdateLogDocId = ({ tokenDocId, versionCode }) =>
  `app_update_${tokenDocId}_${versionCode}`;

const wasUpdateNotificationSent = async ({ tokenDocId, versionCode }) => {
  const docId = getUpdateLogDocId({ tokenDocId, versionCode });
  const doc = await notificationLogsCollection.doc(docId).get();

  return doc.exists;
};

const markUpdateNotificationSent = async ({ tokenDocId, uid, versionCode }) => {
  const docId = getUpdateLogDocId({ tokenDocId, versionCode });

  await notificationLogsCollection.doc(docId).set({
    uid: uid ? String(uid) : null,
    token_doc_id: tokenDocId,
    version_code: versionCode,
    reminder_type: 'app_update',
    channel: 'push',
    sent_at: new Date().toISOString(),
  });
};

const sendAppUpdateNotifications = async (now = new Date()) => {
  const { data: latestVersion, error } = await getAndroidAppVersion();

  if (error || !latestVersion?.versionCode) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      message: error?.message || 'No Android app version configured',
    };
  }

  const snapshot = await pushTokensCollection.where('platform', '==', 'android').get();
  const result = {
    sent: 0,
    skipped: 0,
    failed: 0,
    versionCode: latestVersion.versionCode,
    versionName: latestVersion.versionName,
  };

  for (const doc of snapshot.docs) {
    const tokenData = doc.data();
    const currentVersionCode = Number(tokenData?.app_version_code || 0);

    if (!tokenData?.pushToken || currentVersionCode >= latestVersion.versionCode) {
      result.skipped += 1;
      continue;
    }

    const alreadySent = await wasUpdateNotificationSent({
      tokenDocId: doc.id,
      versionCode: latestVersion.versionCode,
    });

    if (alreadySent) {
      result.skipped += 1;
      continue;
    }

    try {
      await admin.messaging().send({
        token: tokenData.pushToken,
        notification: {
          title: 'Új SpendFox verzió érhető el',
          body: latestVersion.message || `Letölthető a SpendFox ${latestVersion.versionName}.`,
        },
        data: {
          type: 'app_update',
          versionCode: String(latestVersion.versionCode),
          versionName: String(latestVersion.versionName || ''),
          downloadUrl: String(latestVersion.apkUrl || latestVersion.downloadUrl || ''),
        },
      });

      await markUpdateNotificationSent({
        tokenDocId: doc.id,
        uid: tokenData.uid,
        versionCode: latestVersion.versionCode,
      });

      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      console.error('[push] app update notification failed:', {
        tokenDocId: doc.id,
        uid: tokenData.uid,
        message: err.message,
      });
    }
  }

  return result;
};

module.exports = {
  sendAppUpdateNotifications,
};
