import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
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

export function setupPushListeners() {
  const unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage?.notification?.title ?? 'SpendFox';
    const body =
      remoteMessage?.notification?.body ??
      'Új értesítés érkezett a SpendFoxtól.';
    const downloadUrl = remoteMessage?.data?.downloadUrl;

    if (remoteMessage?.data?.type === 'app_update' && downloadUrl) {
      Alert.alert(title, body, [
        { text: 'Később', style: 'cancel' },
        {
          text: 'Letöltés',
          onPress: () =>
            downloadAndInstallUpdate({
              apkUrl: downloadUrl,
              versionCode: remoteMessage?.data?.versionCode,
              versionName: remoteMessage?.data?.versionName,
            }, { showStartedAlert: true }),
        },
      ]);
      return;
    }

    Alert.alert(title, body);
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
