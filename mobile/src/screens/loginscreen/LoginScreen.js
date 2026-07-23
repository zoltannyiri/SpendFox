import React, { useState } from 'react';
import axios from 'axios';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import AppLogoComponent from '../../components/logocomponent/AppLogoComponent';

export default function LoginScreen({navigation}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        setErrorMsg('Az email és a jelszó megadása kötelező.');
        return;
      }

      setLoading(true);

      const payload = {
        email: email.trim(),
        password,
      };

      console.log('[login] POST', `${axios.defaults.baseURL}/auth/login`, {
        email: payload.email,
        password: '***',
      });

      const { data } = await axios.post('/auth/login', payload, {
        timeout: 15000,
      });

      console.log('[login] response:', JSON.stringify(data, null, 2));

      const token = data?.data?.session?.access_token;
      if (!token) {
        const msg = data?.error || data?.message || data?.detail || 'NO_TOKEN';
        setErrorMsg(msg);
        return;
      }

      window.App?.loginSuccess?.(token, data?.data?.user, data?.data?.session);
    } catch (e) {
      const status = e?.response?.status;
      const url = e?.response?.config?.url || '/auth/login';
      const baseURL = e?.response?.config?.baseURL || axios.defaults.baseURL;
      const responseData = e?.response?.data;
      const serverMsg = responseData?.error || responseData?.message || responseData?.detail;

      console.log('[login] error:', {
        baseURL,
        url,
        fullURL: `${baseURL || ''}${url || ''}`,
        status,
        code: e?.code,
        message: e?.message,
        response: responseData,
      });

      if (status === 401) {
        setErrorMsg('Hibás email vagy jelszó.');
      } else if (serverMsg) {
        setErrorMsg(serverMsg);
      } else if (e?.message) {
        setErrorMsg(e.message);
      } else {
        setErrorMsg('UNKNOWN_ERROR');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="min-h-screen justify-center px-8 pb-36 pt-10"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <View className="absolute inset-x-0 bottom-0 h-80 overflow-hidden">
          <BottomFoxScene />
        </View>

        <View className="z-10 w-full items-center">
          <AppLogoComponent size={92} />

          <Text className="mb-9 mt-1 text-4xl font-extrabold text-fox-cyan">
            SpendFox
          </Text>

          <TextInput
            className="mb-3 h-14 w-full rounded-md bg-[#1d1d1f] px-4 text-base text-white"
            placeholder="Email"
            placeholderTextColor="#8f8f95"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            className="h-14 w-full rounded-md bg-[#1d1d1f] px-4 text-base text-white"
            placeholder="Jelszó"
            placeholderTextColor="#8f8f95"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          {/* <View className="my-3 w-full flex-row justify-end">
            <Text className="text-xs font-semibold text-white">
              Elfelejtetted a jelszavad?{' '}
            </Text>
            <Pressable>
              <Text className="text-xs font-semibold text-fox-cyan">
                Visszaállítás
              </Text>
            </Pressable>
          </View> */}

          {!!errorMsg && (
            <Text className="mb-3 self-start text-[13px] text-red-300">
              {errorMsg}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              pressed && { backgroundColor: '#10adad' },
              loading && { opacity: 0.7 },
            ]}
            className="mt-2 h-14 w-full items-center justify-center rounded-md bg-fox-cyan"
            disabled={loading}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-extrabold text-white">
                BELÉPÉS
              </Text>
            )}
          </Pressable>

          <View className="mt-44 flex-row justify-center">
            <Text className="text-sm font-semibold text-white">
              Nincs még fiókod?{' '}
            </Text>
            <Pressable onPress={() => navigation.navigate('RegisterScreen')}>
              <Text className="text-sm font-semibold text-fox-cyan">
                Regisztráció
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BottomFoxScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 320" preserveAspectRatio="xMidYMax slice">
      <Rect width="390" height="320" fill="#000" />
      <Path d="M0 196 C86 172 132 184 210 202 C288 220 338 207 390 185 L390 320 L0 320 Z" fill="#021f19" />
      <Path d="M209 143 C230 126 268 129 292 159 C309 181 324 205 350 210 C321 229 282 219 252 196 C229 178 208 168 187 171 C184 159 194 151 209 143 Z" fill="#803927" opacity="0.82" />
      <Path d="M249 198 C277 228 332 227 376 191 C380 224 368 270 326 291 C274 277 241 244 229 210 Z" fill="#404847" opacity="0.92" />
      <Path d="M180 130 C207 117 232 123 250 150 L232 211 L179 202 C169 175 162 147 180 130 Z" fill="#913a28" />
      <Path d="M207 189 L183 228 L155 204 Z" fill="#bcc8c9" />
      <Path d="M220 190 C243 182 265 180 285 192 C260 200 238 203 220 190 Z" fill="#b48373" />
      <Path d="M264 89 C282 72 307 76 318 96 C300 109 279 108 264 89 Z" fill="#8c9b91" />
      <Circle cx="284" cy="101" r="29" fill="#ad7560" />
      <Path d="M259 91 L244 69 L274 79 Z" fill="#8c9b91" />
      <Path d="M306 83 L324 61 L319 96 Z" fill="#8c9b91" />
      <Ellipse cx="276" cy="105" rx="4" ry="5" fill="#231b18" />
      <Ellipse cx="297" cy="105" rx="4" ry="5" fill="#231b18" />
      <Path d="M282 119 C287 123 294 123 300 119" stroke="#3c2018" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M249 205 C230 227 210 231 194 219 C212 217 229 207 244 190 Z" fill="#5d251c" opacity="0.82" />
      <Path d="M0 250 C84 237 156 246 216 270 C285 298 340 294 390 271 L390 320 L0 320 Z" fill="#00261e" opacity="0.72" />
    </Svg>
  );
}
