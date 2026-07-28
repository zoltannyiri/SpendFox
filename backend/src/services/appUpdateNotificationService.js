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
    return;
  }

  const snapshot = await pushTokensCollection.where('platform', '==', 'android').get();

  for (const doc of snapshot.docs) {
    const tokenData = doc.data();
    const currentVersionCode = Number(tokenData?.app_version_code || 0);

    if (!tokenData?.pushToken || currentVersionCode >= latestVersion.versionCode) {
      continue;
    }

    const alreadySent = await wasUpdateNotificationSent({
      tokenDocId: doc.id,
      versionCode: latestVersion.versionCode,
    });

    if (alreadySent) {
      continue;
    }

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
  }
};

module.exports = {
  sendAppUpdateNotifications,
};
