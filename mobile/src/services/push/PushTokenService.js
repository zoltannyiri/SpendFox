import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import axios from 'axios';
import { APP_VERSION } from '../../config/appVersion';
import { downloadAndInstallUpdate } from '../appUpdate/ApkUpdateService';

export async function requestAndRegisterPushToken() {
  try {
    const hasPermission = await requestPushPermission();

    if (!hasPermission) {
      console.log('Push permission was not granted');
      return null;
    }

    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      console.log('FCM token was empty');
      return null;
    }

    await registerPushToken(fcmToken);
    return fcmToken;
  } catch (err) {
    console.log('Push token registration failed:', err?.response?.data || err?.message || err);
    return null;
  }
}

export async function syncPushTokenVersion() {
  try {
    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      return null;
    }

    await registerPushToken(fcmToken);
    return fcmToken;
  } catch (err) {
    console.log('Push token version sync failed:', err?.response?.data || err?.message || err);
    return null;
  }
}

export function setupPushListeners({ onForegroundNotification, onNotificationOpen } = {}) {
  const unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage?.notification?.title ?? 'SpendFox';
    const body =
      remoteMessage?.notification?.body ??
      'Új értesítés érkezett a SpendFoxtól.';
    const downloadUrl = remoteMessage?.data?.downloadUrl;
    const openableNotificationTypes = ['subscription_share_message'];

    if (remoteMessage?.data?.type === 'app_update' && downloadUrl) {
      onForegroundNotification?.({
        id: remoteMessage?.messageId || `${Date.now()}`,
        title,
        body,
        actionLabel: 'Letöltés',
        onAction: () =>
          downloadAndInstallUpdate({
            apkUrl: downloadUrl,
            versionCode: remoteMessage?.data?.versionCode,
            versionName: remoteMessage?.data?.versionName,
          }, { showStartedAlert: true }),
      });
      return;
    }

    onForegroundNotification?.({
      id: remoteMessage?.messageId || `${Date.now()}`,
      title,
      body,
      actionLabel: openableNotificationTypes.includes(remoteMessage?.data?.type) ? 'Megnyitás' : undefined,
      onAction: openableNotificationTypes.includes(remoteMessage?.data?.type)
        ? () => onNotificationOpen?.(remoteMessage)
        : undefined,
    });
  });

  const unsubscribeNotificationOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
    onNotificationOpen?.(remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        onNotificationOpen?.(remoteMessage);
      }
    })
    .catch((err) => {
      console.log('Initial push notification handling failed:', err?.message || err);
    });

  const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
    try {
      await registerPushToken(newToken);
    } catch (err) {
      console.log('Push token refresh registration failed:', err?.response?.data || err?.message || err);
    }
  });

  return () => {
    unsubscribeMessage();
    unsubscribeNotificationOpen();
    unsubscribeTokenRefresh();
  };
}

export function setupBackgroundPushHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background push received:', remoteMessage?.messageId);
  });
}

async function requestPushPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );

    if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();

  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

async function registerPushToken(pushToken) {
  await axios.post('/push/register', {
    pushToken,
    platform: Platform.OS,
    appVersionCode: APP_VERSION.androidVersionCode,
    appVersionName: APP_VERSION.androidVersionName,
  });
}
