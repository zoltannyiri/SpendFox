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
import useKeyboardSafeScroll from '../../hooks/useKeyboardSafeScroll';

const storage = new MMKV();

const visibilityOptions = [
  {
    id: 'private',
    label: 'Privát',
    description: 'Csak te látod a profilod részleteit.',
  },
  {
    id: 'friends',
    label: 'Barátok',
    description: 'Csak az elfogadott barátaid láthatják.',
  },
  {
    id: 'public',
    label: 'Nyilvános',
    description: 'Megosztható SpendFox profilként is látható.',
  },
];

const feedAutoShareOptions = [
  {
    id: 'subscription_created',
    title: 'Új előfizetés',
    text: 'Automatikus feed aktivitás, amikor új előfizetést adsz hozzá.',
  },
  {
    id: 'shared_subscription_created',
    title: 'Közös előfizetés',
    text: 'Automatikus aktivitás, amikor közös előfizetést hozol létre.',
  },
  {
    id: 'subscription_cancelled',
    title: 'Lemondás',
    text: 'Automatikus aktivitás, amikor lemondasz egy aktív előfizetést.',
  },
];

const defaultFeedAutoShare = {
  subscription_created: false,
  shared_subscription_created: false,
  subscription_cancelled: false,
};

function mergeNotificationSettings(settings = {}) {
  return {
    ...(settings || {}),
    feed_auto_share: {
      ...defaultFeedAutoShare,
      ...(settings?.feed_auto_share || {}),
    },
  };
}

export default function ProfileSettingsForm() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [profileVisibility, setProfileVisibility] = useState('private');
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(() =>
    mergeNotificationSettings()
  );
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const {
    scrollRef,
    contentContainerStyle,
    scrollToEndAfterKeyboard,
  } = useKeyboardSafeScroll({
    defaultBottomPadding: 288,
    keyboardBottomPadding: 380,
  });

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
    setBio(profile?.bio || '');
    setLocation(profile?.location || '');
    setProfileVisibility(profile?.profile_visibility || 'private');
    setPublicProfileEnabled(Boolean(profile?.public_profile_enabled));
    setNotificationSettings(mergeNotificationSettings(profile?.notification_settings));
  };

  const updateFeedAutoShare = (field, value) => {
    setNotificationSettings((previous) => {
      const merged = mergeNotificationSettings(previous);

      return {
        ...merged,
        feed_auto_share: {
          ...merged.feed_auto_share,
          [field]: value,
        },
      };
    });
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
        bio: bio.trim() || null,
        location: location.trim() || null,
        public_profile_enabled: publicProfileEnabled,
        profile_visibility: profileVisibility,
        notification_settings: notificationSettings,
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
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="pb-72"
        contentContainerStyle={contentContainerStyle}
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
                onFocus={scrollToEndAfterKeyboard}
                returnKeyType="done"
              />
            </View>

            <View className="mt-5">
              <FieldLabel label="Bemutatkozás" />
              <TextInput
                className="min-h-28 rounded-2xl bg-[#f7f8fa] px-4 py-4 text-base font-semibold leading-6 text-black"
                placeholder="Írj pár mondatot magadról..."
                placeholderTextColor="#9b9ba1"
                multiline
                maxLength={260}
                value={bio}
                onChangeText={setBio}
                onFocus={scrollToEndAfterKeyboard}
                textAlignVertical="top"
              />
              <Text className="mt-2 text-right text-xs font-bold text-neutral-400">
                {bio.length}/260
              </Text>
            </View>

            <View className="mt-5">
              <FieldLabel label="Hely" />
              <TextInput
                className="h-14 rounded-2xl bg-[#f7f8fa] px-4 text-base font-semibold text-black"
                placeholder="Budapest, Magyarország"
                placeholderTextColor="#9b9ba1"
                value={location}
                onChangeText={setLocation}
                onFocus={scrollToEndAfterKeyboard}
                returnKeyType="done"
              />
            </View>
          </View>

          <View className="mt-6 rounded-[28px] bg-white p-4" style={cardShadow}>
            <Text className="text-base font-extrabold text-black">Profil láthatóság</Text>
            <Text className="mt-1 text-sm font-semibold leading-5 text-neutral-500">
              Beállíthatod, mennyi profiladatot lássanak mások.
            </Text>

            <View className="mt-4">
              {visibilityOptions.map((option) => {
                const active = profileVisibility === option.id;

                return (
                  <Pressable
                    key={option.id}
                    className={`mb-3 rounded-2xl border px-4 py-4 ${
                      active ? 'border-[#0ca9f2] bg-[#eef7ff]' : 'border-neutral-100 bg-[#f7f8fa]'
                    }`}
                    onPress={() => setProfileVisibility(option.id)}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-extrabold text-black">{option.label}</Text>
                      <View
                        className={`h-5 w-5 rounded-full border ${
                          active ? 'border-[#0ca9f2] bg-[#0ca9f2]' : 'border-neutral-300'
                        }`}
                      />
                    </View>
                    <Text className="mt-1 text-xs font-semibold leading-5 text-neutral-500">
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ToggleRow
              title="Nyilvános profil link"
              text="A profilod külön linkként is megosztható legyen."
              value={publicProfileEnabled}
              onChange={setPublicProfileEnabled}
            />
          </View>

          <View className="mt-6 rounded-[28px] bg-white p-4" style={cardShadow}>
            <Text className="text-base font-extrabold text-black">
              Automatikus feed megosztás
            </Text>
            <Text className="mt-1 text-sm font-semibold leading-5 text-neutral-500">
              Csak akkor jelenik meg aktivitás a feedben, ha ezt külön engedélyezed.
            </Text>

            <View className="mt-4">
              {feedAutoShareOptions.map((option) => (
                <ToggleRow
                  key={option.id}
                  title={option.title}
                  text={option.text}
                  value={Boolean(notificationSettings?.feed_auto_share?.[option.id])}
                  onChange={(value) => updateFeedAutoShare(option.id, value)}
                />
              ))}
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

function ToggleRow({ title, text, value, onChange }) {
  return (
    <Pressable
      className="mb-3 flex-row items-center justify-between rounded-2xl bg-[#f7f8fa] px-4 py-4"
      onPress={() => onChange(!value)}
    >
      <View className="flex-1 pr-4">
        <Text className="text-sm font-extrabold text-black">{title}</Text>
        <Text className="mt-1 text-xs font-semibold leading-5 text-neutral-500">{text}</Text>
      </View>
      <View
        className={`h-7 w-12 justify-center rounded-full px-1 ${
          value ? 'items-end bg-[#0ca9f2]' : 'items-start bg-neutral-300'
        }`}
      >
        <View className="h-5 w-5 rounded-full bg-white" />
      </View>
    </Pressable>
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
