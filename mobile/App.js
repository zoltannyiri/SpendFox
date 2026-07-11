import React, { Component } from 'react';
import './global.css';
import {
  Alert,
  AppState,
  BackHandler,
  NativeModules,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeBaseProvider } from 'native-base';
import LoginScreen from './src/screens/loginscreen/LoginScreen';
import RegisterScreen from './src/screens/registerscreen/RegisterScreen';
import HomeScreen from './src/screens/homescreen/HomeScreen';
import ProfileScreen from './src/screens/profilescreen/ProfileScreen';
import SubscriptionsScreen from './src/screens/subscriptionscreen/SubscriptionsScreen';
import SubscriptionsFormScreen from './src/screens/subscriptionscreen/SubscriptionsFormScreen';
import ProfileSettingsScreen from './src/screens/profilesettingsscreen/ProfileSettingsScreen';
import ProfileSettingsForm from './src/screens/profilesettingsscreen/ProfileSettingsForm';
import { setupPushListeners } from './src/services/push/PushTokenService';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
const storage = new MMKV();
const API_BASE = process.env.REACT_APP_API_HOST ?? 'http://192.168.0.2:5000/api';
let refreshRequest = null;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

axios.defaults.baseURL = API_BASE;

if (typeof BackHandler.removeEventListener !== 'function') {
  BackHandler.removeEventListener = () => {};
}

axios.interceptors.request.use(
  (config) => {
    const token = storage.getString('userToken');

    config.headers = {
      ...(config.headers || {}),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error?.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const refreshToken = storage.getString('refreshToken');

    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = refreshAccessToken(refreshToken).finally(() => {
          refreshRequest = null;
        });
      }

      const token = await refreshRequest;

      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${token}`,
      };

      return axios(originalRequest);
    } catch (refreshError) {
      storage.delete('userToken');
      storage.delete('refreshToken');
      storage.delete('tokenExpiresAt');
      storage.delete('appUser');
      window.App?.logout?.();

      return Promise.reject(refreshError);
    }
  }
);

async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || 'Token refresh failed');
  }

  const session = result?.data?.session;

  if (!session?.access_token) {
    throw new Error('Refresh response did not contain an access token');
  }

  storage.set('userToken', session.access_token);

  if (session.refresh_token) {
    storage.set('refreshToken', session.refresh_token);
  }

  if (session.expires_in) {
    storage.set('tokenExpiresAt', String(Date.now() + Number(session.expires_in) * 1000));
  }

  return session.access_token;
}

const deviceLanguage =
  Platform.OS === 'ios'
    ? NativeModules.SettingsManager?.settings?.AppleLocale ||
      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
    : NativeModules.I18nManager?.localeIdentifier;

const HeaderLeft = () => null;

class App extends Component {
  constructor(props) {
    super(props);
    window.App = this;
    this.state = {
      userToken: storage.getString('userToken') || null,
    };
  }

  componentDidMount() {
    this.unsubscribePushListeners = setupPushListeners();
    this.backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      this.handleHardwareBack
    );
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    if (!storage.getString('language') || storage.getString('language') === undefined) {
      if (deviceLanguage?.substring(0, 2) === 'hu') {
        storage.set('language', 'hu');
      } else {
        storage.set('language', 'en');
      }
    }

    if (this.state.userToken) {
      this.refreshExchangeRatesIfNeeded();
    }
  }

  componentWillUnmount() {
    this.unsubscribePushListeners?.();
    this.backSubscription?.remove?.();
    this.appStateSubscription?.remove?.();
  }

  handleAppStateChange = (nextState) => {
    if (nextState === 'active' && this.state.userToken) {
      this.refreshExchangeRatesIfNeeded();
    }
  };

  handleHardwareBack = () => {
    if (!navigationRef.isReady()) {
      return false;
    }

    const routeName = navigationRef.getCurrentRoute()?.name;

    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return true;
    }

    if (routeName && routeName !== 'HomeScreen') {
      navigationRef.navigate('HomeScreen');
      return true;
    }

    return true;
  };

  loginSuccess = (token, user, session) => {
    storage.set('userToken', token);

    if (session?.refresh_token) {
      storage.set('refreshToken', session.refresh_token);
    }

    if (session?.expires_in) {
      storage.set('tokenExpiresAt', String(Date.now() + Number(session.expires_in) * 1000));
    }

    if (user) {
      storage.set('appUser', JSON.stringify(user));
    }

    this.setState({ userToken: token });
    this.refreshExchangeRatesIfNeeded();
  };

  refreshExchangeRatesIfNeeded = async () => {
    try {
      const todayKey = getTodayKey();

      if (storage.getString('exchangeRatesLastRefreshDate') === todayKey) {
        return;
      }

      const response = await axios.post('/subscriptions/exchange-rates/refresh');

      if (response.data?.data?.last_refresh_date) {
        storage.set('exchangeRatesLastRefreshDate', response.data.data.last_refresh_date);
      } else {
        storage.set('exchangeRatesLastRefreshDate', todayKey);
      }
    } catch (err) {
      console.log(
        'Failed to refresh exchange rates:',
        err?.response?.data || err?.message
      );
    }
  };

  alert = (response, button = 'Ok') => {
    console.log(JSON.stringify(response, null, 2));

    let title = response?.data?.title;
    if (!response?.data?.status || response?.data?.status === 'undefined') {
      title = response?.data?.code;
    }

    let message = response?.data?.message;
    if (!response?.data?.message || response?.data?.message === 'undefined') {
      message = response?.data?.detail;
    }

    if (response?.data?.length === 0) {
      title = response.status.toString();
    }

    Alert.alert(message, String(title), [{ text: button }]);
  };

  // loginSuccess = (token) => {
  //   storage.set('userToken', token);
  //   this.setState({ userToken: token });
  // };

  logout = () => {
    storage.delete('userToken');
    storage.delete('refreshToken');
    storage.delete('tokenExpiresAt');
    storage.delete('appUser');
    this.setState({ userToken: null });
  };

  render() {
    const { userToken } = this.state;

    return (
      <GestureHandlerRootView style={styles.root}>
        <NativeBaseProvider>
          <StatusBar barStyle="light-content" backgroundColor="#19386e" />
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              screenOptions={() => ({
                headerShown: true,
                headerStyle: { backgroundColor: '#19386e' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '600' },
                headerShadowVisible: true,
                headerTitleAlign: 'left',
                statusBarStyle: 'light',
                statusBarColor: '#19386e',
                headerLeft: HeaderLeft,
              })}
            >
              {!userToken ? (
                <>
                  <Stack.Screen
                    name="LoginScreen"
                    component={LoginScreen}
                    options={{
                      title: 'Login',
                      headerShown: false,
                      headerLeft: undefined,
                    }}
                  />
                  <Stack.Screen
                    name="RegisterScreen"
                    component={RegisterScreen}
                    options={{
                      title: 'Register',
                      headerShown: false,
                      headerLeft: undefined,
                    }}
                  />
                </>
              ) : (
                <>
                  <Stack.Screen
                    name="HomeScreen"
                    component={HomeScreen}
                    options={{
                      title: 'Home',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="ProfileScreen"
                    component={ProfileScreen}
                    options={{
                      title: 'Profil',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="Subscriptions"
                    component={SubscriptionsScreen}
                    options={{
                      title: 'Előfizetéseim',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="SubscriptionsForm"
                    component={SubscriptionsFormScreen}
                    options={{
                      title: 'Előfizetés hozzáadása',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="ProfileSettingsScreen"
                    component={ProfileSettingsScreen}
                    options={{
                      title: 'Profil szerkesztése',
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="ProfileSettingsForm"
                    component={ProfileSettingsForm}
                    options={{
                      title: 'Profil szerkesztése',
                      headerShown: false,
                    }}
                  />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </NativeBaseProvider>
      </GestureHandlerRootView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
