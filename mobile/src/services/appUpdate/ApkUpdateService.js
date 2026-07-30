import { Alert, Linking, NativeModules, Platform } from 'react-native';
import axios from 'axios';

const { ApkInstaller } = NativeModules;
let currentDownloadPromise = null;

export function resolveUpdateUrl(update) {
  const updateUrl = update?.apkUrl || update?.downloadUrl;

  if (!updateUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(updateUrl)) {
    return updateUrl;
  }

  const baseUrl = axios.defaults.baseURL || '';
  const baseOrigin = baseUrl.replace(/\/api\/?$/, '');
  const normalizedPath = updateUrl.startsWith('/') ? updateUrl : `/${updateUrl}`;

  return `${baseOrigin}/api${normalizedPath}`;
}

export function isUpdateDownloadInProgress() {
  return Boolean(currentDownloadPromise);
}

export async function downloadAndInstallUpdate(update, options = {}) {
  const updateUrl = resolveUpdateUrl(update);

  if (!updateUrl) {
    Alert.alert('Frissítés', 'Nincs beállítva letöltési link az új verzióhoz.');
    return;
  }

  if (currentDownloadPromise) {
    Alert.alert('Frissítés', 'A frissítés letöltése már folyamatban van.');
    return currentDownloadPromise;
  }

  if (Platform.OS !== 'android' || !ApkInstaller?.downloadAndInstallApk) {
    await Linking.openURL(updateUrl);
    return;
  }

  if (options.showStartedAlert) {
    Alert.alert('Frissítés', 'A letöltés elindult a háttérben.');
  }

  currentDownloadPromise = ApkInstaller.downloadAndInstallApk(
    updateUrl,
    'spendfox-update.apk'
  );

  try {
    await currentDownloadPromise;
  } catch (err) {
    if (err?.code === 'INSTALL_PERMISSION_REQUIRED') {
      Alert.alert(
        'Engedély szükséges',
        'Engedélyezd az ismeretlen appok telepítését a SpendFox számára, majd nyomj újra a frissítésre.'
      );
      return;
    }

    Alert.alert(
      'Frissítés',
      err?.message || 'Nem sikerült letölteni vagy elindítani a telepítést.'
    );
  } finally {
    currentDownloadPromise = null;
  }
}
