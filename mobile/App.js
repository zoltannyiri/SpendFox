import React, { Component } from 'react';
import './global.css';
import {
  Alert,
  NativeModules,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LoginScreen from './src/screens/loginscreen/LoginScreen';
import RegisterScreen from './src/screens/registerscreen/RegisterScreen';

const Stack = createNativeStackNavigator();
const storage = new MMKV();

const deviceLanguage =
  Platform.OS === 'ios'
    ? NativeModules.SettingsManager?.settings?.AppleLocale ||
      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
    : NativeModules.I18nManager?.localeIdentifier;

const HeaderLeft = () => null;

const HomeScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Home</Text>
    <Pressable style={styles.button} onPress={() => window.App?.logout()}>
      <Text style={styles.buttonText}>Logout</Text>
    </Pressable>
  </View>
);

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

  loginSuccess = (token) => {
    storage.set('userToken', token);
    this.setState({ userToken: token });
  };

  logout = () => {
    storage.delete('userToken');
    this.setState({ userToken: null });
  };

  render() {
    const { userToken } = this.state;

    return (
      <GestureHandlerRootView style={styles.root}>
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
                  }}
                />
                <Stack.Screen
                  name="ProfileScreen"
                  component={ProfileScreen}
                  options={{
                    title: 'Profil',
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
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
