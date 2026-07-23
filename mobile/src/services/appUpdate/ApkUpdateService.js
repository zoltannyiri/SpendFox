import { Alert, Linking, NativeModules, Platform } from 'react-native';
import axios from 'axios';

const { ApkInstaller } = NativeModules;

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

export async function downloadAndInstallUpdate(update) {
  const updateUrl = resolveUpdateUrl(update);

  if (!updateUrl) {
    Alert.alert('Frissítés', 'Nincs beállítva letöltési link az új verzióhoz.');
    return;
  }

  if (Platform.OS !== 'android' || !ApkInstaller?.downloadAndInstallApk) {
    await Linking.openURL(updateUrl);
    return;
  }

  try {
    await ApkInstaller.downloadAndInstallApk(updateUrl, 'spendfox-update.apk');
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
      err?.message || 'Nem sikerült letölteni vagy elindítani az APK telepítését.'
    );
  }
}
