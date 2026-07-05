import React, { Component } from 'react';
import './global.css';
import {
  Alert,
  BackHandler,
  NativeModules,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeBaseProvider } from 'native-base';
import LoginScreen from './src/screens/loginscreen/LoginScreen';
import RegisterScreen from './src/screens/registerscreen/RegisterScreen';
import HomeScreen from './src/screens/homescreen/HomeScreen';
import SubscriptionsScreen from './src/screens/subscriptionscreen/SubscriptionsScreen';
import SubscriptionsFormScreen from './src/screens/subscriptionscreen/SubscriptionsFormScreen';
import ProfileSettingsScreen from './src/screens/profilesettingsscreen/ProfileSettingsScreen';
import ProfileSettingsForm from './src/screens/profilesettingsscreen/ProfileSettingsForm';

const Stack = createNativeStackNavigator();
const storage = new MMKV();
const API_BASE = process.env.REACT_APP_API_HOST ?? 'http://10.0.2.2:5000/api';
let refreshRequest = null;

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

const ProfileScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Profile</Text>
  </View>
);

class App extends Component {
  constructor(props) {
    super(props);
    window.App = this;
    this.state = {
      userToken: storage.getString('userToken') || null,
    };
  }

  componentDidMount() {
    if (!storage.getString('language') || storage.getString('language') === undefined) {
      if (deviceLanguage?.substring(0, 2) === 'hu') {
        storage.set('language', 'hu');
      } else {
        storage.set('language', 'en');
      }
    }
  }

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
          <NavigationContainer>
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
                    }}
                  />
                  <Stack.Screen
                    name="Subscriptions"
                    component={SubscriptionsScreen}
                    options={{
                      title: 'Előfizetéseim',
                    }}
                  />
                  <Stack.Screen
                    name="SubscriptionsForm"
                    component={SubscriptionsFormScreen}
                    options={{
                      title: 'Előfizetés hozzáadása',
                    }}
                  />
                  <Stack.Screen
                    name="ProfileSettingsScreen"
                    component={ProfileSettingsScreen}
                    options={{
                      title: 'Profil szerkesztése',
                    }}
                  />
                  <Stack.Screen
                    name="ProfileSettingsForm"
                    component={ProfileSettingsForm}
                    options={{
                      title: 'Profil szerkesztése',
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
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#19386e',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#11d8d8',
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#19386e',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default App;
