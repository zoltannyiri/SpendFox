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
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import AnimatedScreen from '../../components/layout/AnimatedScreen';

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
        setErrorText('Az email megadása kötelező.');
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
      setErrorText(err?.response?.data?.error || 'Nem sikerült menteni a profilt.');
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
        setErrorText(response.errorMessage || 'Nem sikerült kiválasztani a képet.');
        return;
      }

      const asset = response.assets?.[0];

      if (!asset?.base64) {
        setErrorText('A kiválasztott kép nem olvasható.');
        return;
      }

      setAvatarUrl(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
      setErrorText('');
    } catch (err) {
      console.log('Failed to pick avatar:', err?.message);
      setErrorText('Nem sikerült kiválasztani a képet.');
    }
  };

  const handleClearAvatar = () => {
    Alert.alert('Avatar törlése', 'Biztosan törölni szeretnéd az avatart?', [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () => setAvatarUrl(''),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f3f5f8]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#19386e" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-72"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="Profil szerkesztése"
          subtitle="Név, email és avatar"
          left={
            <HeaderIconButton onPress={() => navigation.goBack()}>
              <BackIcon />
            </HeaderIconButton>
          }
          compact
        />

        <AnimatedScreen className="-mt-10 px-5">
          <View className="items-center rounded-[30px] bg-white px-5 py-7" style={cardShadow}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-24 w-24 rounded-3xl bg-fox-cream"
                resizeMode="cover"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-3xl bg-fox-cream">
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
              <Pressable className="rounded-full bg-black px-4 py-3" onPress={handlePickAvatar}>
                <Text className="text-xs font-extrabold text-white">Kép választása</Text>
              </Pressable>

              {!!avatarUrl && (
                <Pressable
                  className="ml-3 rounded-full bg-red-50 px-4 py-3"
                  onPress={handleClearAvatar}
                >
                  <Text className="text-xs font-extrabold text-red-600">Törlés</Text>
                </Pressable>
              )}
            </View>
          </View>

          {!!errorText && (
            <View className="mt-5 rounded-2xl bg-red-50 px-4 py-3">
              <Text className="text-sm font-bold text-red-600">{errorText}</Text>
            </View>
          )}

          <View className="mt-7 rounded-[28px] bg-white p-4" style={cardShadow}>
            <FieldLabel label="Teljes név" />
            <TextInput
              className="h-14 rounded-2xl bg-[#f7f8fa] px-4 text-base font-semibold text-black"
              placeholder=""
              placeholderTextColor="#9b9ba1"
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="next"
            />

            <View className="mt-5">
              <FieldLabel label="Felhasználónév" />
              <TextInput
                className="h-14 rounded-2xl bg-[#f7f8fa] px-4 text-base font-semibold text-black"
                placeholder=""
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
                className="h-14 rounded-2xl bg-[#f7f8fa] px-4 text-base font-semibold text-black"
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
                className="min-h-14 rounded-2xl bg-[#f7f8fa] px-4 py-4 text-base font-semibold text-black"
                placeholder={
                  isEmbeddedImage(avatarUrl)
                    ? 'Helyi kép kiválasztva. Linkhez töröld vagy írj be URL-t.'
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
              <Text className="text-base font-extrabold text-white">Profil mentése</Text>
            )}
          </Pressable>
        </AnimatedScreen>
      </ScrollView>
      <BottomNavigation />
    </KeyboardAvoidingView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 4,
};

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
