import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { launchImageLibrary } from 'react-native-image-picker';
import BottomNavigation from '../../components/layout/BottomNavigation';

const storage = new MMKV();

export default function ProfileSettingsForm() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      fillForm(storedUser);
    }

    const loadProfile = async () => {
      try {
        const response = await axios.get('/profile');
        const profile = response.data?.data;

        if (profile) {
          storage.set('appUser', JSON.stringify(profile));
          fillForm(profile);
        }
      } catch (err) {
        console.log('Failed to load profile:', err?.response?.data || err?.message);
      }
    };

    loadProfile();
  }, []);

  const fillForm = (profile) => {
    setFullName(profile?.full_name || profile?.user_metadata?.full_name || '');
    setUsername(profile?.username || profile?.user_metadata?.username || '');
    setEmail(profile?.email || '');
    setAvatarUrl(profile?.avatar_url || profile?.user_metadata?.avatar_url || '');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorText('');

      if (!email.trim()) {
        setErrorText('Az email megadasa kotelezo.');
        return;
      }

      const payload = {
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        email: email.trim(),
        avatar_url: avatarUrl.trim() || null,
      };

      const response = await axios.patch('/profile', payload);
      const profile = response.data?.data;

      if (profile) {
        storage.set('appUser', JSON.stringify(profile));
      }

      navigation.goBack();
    } catch (err) {
      console.log('Failed to update profile:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerult menteni a profilt.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.75,
      });

      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        setErrorText(response.errorMessage || 'Nem sikerult kivalasztani a kepet.');
        return;
      }

      const asset = response.assets?.[0];

      if (!asset?.base64) {
        setErrorText('A kivalasztott kep nem olvashato.');
        return;
      }

      setAvatarUrl(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
      setErrorText('');
    } catch (err) {
      console.log('Failed to pick avatar:', err?.message);
      setErrorText('Nem sikerult kivalasztani a kepet.');
    }
  };

  const handleClearAvatar = () => {
    Alert.alert('Avatar torlese', 'Biztosan torolni szeretned az avatart?', [
      { text: 'Megse', style: 'cancel' },
      {
        text: 'Torles',
        style: 'destructive',
        onPress: () => setAvatarUrl(''),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f7f7f8]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f8" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-32 pt-16"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 flex-row items-center justify-between">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </Pressable>

          <Text className="text-base font-extrabold text-black">Profil szerkesztese</Text>

          <View className="h-10 w-10" />
        </View>

        <View className="items-center rounded-3xl bg-white px-5 py-7">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-24 w-24 rounded-full bg-fox-cream"
              resizeMode="cover"
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-fox-cream">
              <Text className="text-3xl font-extrabold text-[#19386e]">
                {getInitial(fullName || email)}
              </Text>
            </View>
          )}

          <Text className="mt-4 text-xl font-extrabold text-black">
            {fullName || 'SpendFox user'}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-neutral-500">
            {email || 'email@example.com'}
          </Text>

          <View className="mt-5 flex-row">
            <Pressable
              className="rounded-full bg-black px-4 py-3"
              onPress={handlePickAvatar}
            >
              <Text className="text-xs font-extrabold text-white">Kep valasztasa</Text>
            </Pressable>

            {!!avatarUrl && (
              <Pressable
                className="ml-3 rounded-full bg-red-50 px-4 py-3"
                onPress={handleClearAvatar}
              >
                <Text className="text-xs font-extrabold text-red-600">Torles</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!!errorText && (
          <View className="mt-5 rounded-2xl bg-red-50 px-4 py-3">
            <Text className="text-sm font-bold text-red-600">{errorText}</Text>
          </View>
        )}

        <View className="mt-7">
          <FieldLabel label="Teljes nev" />
          <TextInput
            className="h-14 rounded-2xl bg-white px-4 text-base font-semibold text-black"
            placeholder="Nyiri Zoltan"
            placeholderTextColor="#9b9ba1"
            value={fullName}
            onChangeText={setFullName}
            returnKeyType="next"
          />

          <View className="mt-5">
            <FieldLabel label="Felhasznalonev" />
            <TextInput
              className="h-14 rounded-2xl bg-white px-4 text-base font-semibold text-black"
              placeholder="admin"
              placeholderTextColor="#9b9ba1"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              returnKeyType="next"
            />
          </View>

          <View className="mt-5">
            <FieldLabel label="Email" />
            <TextInput
              className="h-14 rounded-2xl bg-white px-4 text-base font-semibold text-black"
              placeholder="email@example.com"
              placeholderTextColor="#9b9ba1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>

          <View className="mt-5">
            <FieldLabel label="Avatar URL" />
            <TextInput
              className="min-h-14 rounded-2xl bg-white px-4 py-4 text-base font-semibold text-black"
              placeholder={
                isEmbeddedImage(avatarUrl)
                  ? 'Helyi kep kivalasztva. Linkhez torold vagy irj be URL-t.'
                  : 'https://...'
              }
              placeholderTextColor="#9b9ba1"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              value={isEmbeddedImage(avatarUrl) ? '' : avatarUrl}
              onChangeText={setAvatarUrl}
              returnKeyType="done"
            />
            {isEmbeddedImage(avatarUrl) && (
              <Text className="mt-2 text-xs font-semibold text-neutral-500">
                A kivalasztott kep el lesz mentve avatar kepkent. Ha linket szeretnel,
                torold az avatart es illeszd be az URL-t.
              </Text>
            )}
          </View>
        </View>

        <Pressable
          className={`mt-8 h-14 items-center justify-center rounded-2xl ${
            saving ? 'bg-neutral-400' : 'bg-black'
          }`}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-extrabold text-white">Profil mentese</Text>
          )}
        </Pressable>
      </ScrollView>
      <BottomNavigation />
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label }) {
  return (
    <Text className="mb-2 text-sm font-extrabold text-neutral-700">{label}</Text>
  );
}

function getStoredUser() {
  try {
    const storedUser = storage.getString('appUser');

    return storedUser ? JSON.parse(storedUser) : null;
  } catch (err) {
    console.log('Failed to parse stored profile:', err?.message);
    return null;
  }
}

function getInitial(value) {
  return value?.trim()?.charAt(0)?.toUpperCase() || 'S';
}

function isEmbeddedImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5 8 12l7 7"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
