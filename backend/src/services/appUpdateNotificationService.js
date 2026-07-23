const { admin, db } = require('./firestoreClient');
const { getAndroidAppVersion } = require('./appVersionService');

const pushTokensCollection = db.collection('push_tokens');
const notificationLogsCollection = db.collection('notification_logs');

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const wasUpdateNotificationSent = async ({ tokenDocId, versionCode, todayKey }) => {
  const docId = `app_update_${tokenDocId}_${versionCode}_${todayKey}`;
  const doc = await notificationLogsCollection.doc(docId).get();

  return doc.exists;
};

const markUpdateNotificationSent = async ({ tokenDocId, uid, versionCode, todayKey }) => {
  const docId = `app_update_${tokenDocId}_${versionCode}_${todayKey}`;

  await notificationLogsCollection.doc(docId).set({
    uid: uid ? String(uid) : null,
    token_doc_id: tokenDocId,
    version_code: versionCode,
    target_date: todayKey,
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

  const todayKey = formatDateOnly(now);
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
      todayKey,
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
      todayKey,
    });
  }
};

module.exports = {
  sendAppUpdateNotifications,
};
