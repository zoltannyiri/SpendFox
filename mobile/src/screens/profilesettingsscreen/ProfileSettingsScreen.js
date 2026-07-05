import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [form, setForm] = useState({
    emailNotifications: true,
    pushNotifications: false,
  });

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      setProfile(storedUser);
    }

    const loadProfile = async () => {
      try {
        const response = await axios.get('/profile');
        const profile = response.data?.data;

        if (profile) {
          storage.set('appUser', JSON.stringify(profile));
          setProfile(profile);
        }
      } catch (err) {
        console.log('Failed to load profile:', err?.response?.data || err?.message);
      }
    };

    loadProfile();
  }, []);

  const setProfile = (profile) => {
    setProfileName(getUserName(profile));
    setProfileAvatar(getUserAvatar(profile));
    setProfileEmail(profile?.email || '');
  };

  return (
    <View className="flex-1 bg-[#f7f7f8]">
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f8" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-16"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 flex-row items-center justify-between">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </Pressable>

          <Text className="text-base font-extrabold text-black">Profil beállítások</Text>

          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
            <MoreIcon />
          </Pressable>
        </View>

        <View className="items-center rounded-3xl bg-white px-5 py-7">
          {profileAvatar ? (
            <Image
              source={{ uri: profileAvatar }}
              className="h-24 w-24 rounded-full bg-fox-cream"
              resizeMode="cover"
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-fox-cream">
              <Text className="text-3xl font-extrabold text-[#19386e]">
                {getInitial(profileName)}
              </Text>
            </View>
          )}

          <Text className="mt-4 text-2xl font-extrabold text-black">
            {profileName || 'SpendFox user'}
          </Text>
          {!!profileEmail && (
            <Text className="mt-1 text-sm font-semibold text-neutral-500">
              {profileEmail}
            </Text>
          )}

          <Pressable
            className="mt-5 rounded-full bg-black px-5 py-3"
            onPress={() => navigation.navigate('ProfileSettingsForm')}
          >
            <Text className="text-sm font-extrabold text-white">Profil szerkesztése</Text>
          </Pressable>
        </View>

        <Section title="Értesítések">
          <SettingSwitchRow
            icon={<MailIcon />}
            label="Email értesítések"
            description="Fontos fiók és promóciós értesítések"
            value={form.emailNotifications}
            onValueChange={(emailNotifications) =>
              setForm((current) => ({ ...current, emailNotifications }))
            }
          />
          <SettingSwitchRow
            icon={<BellIcon />}
            label="App értesítések"
            description="Emlékeztetők es havi összegzések"
            value={form.pushNotifications}
            onValueChange={(pushNotifications) =>
              setForm((current) => ({ ...current, pushNotifications }))
            }
          />
        </Section>

        <Section title="Fiók">
          <SettingActionRow
            icon={<ShieldIcon />}
            label="Adatvédelem"
            description="Fiók es adatkezelési beállítások"
          />
          <SettingActionRow
            icon={<HelpIcon />}
            label="Segítség"
            description="Kapcsolat, hibajelentés és támogatás"
          />
          <SettingActionRow
            icon={<DocumentIcon />}
            label="Feltételek és adatvédelem"
            description="Jogi információk es szabályzatok"
          />
        </Section>

        <Pressable
          className="mt-6 h-14 items-center justify-center rounded-2xl bg-red-50"
          onPress={() => window.App?.logout?.()}
        >
          <Text className="text-base font-extrabold text-red-600">Kijelentkezés</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View className="mt-7">
      <Text className="mb-3 text-xs font-extrabold uppercase tracking-wide text-neutral-400">
        {title}
      </Text>
      <View className="overflow-hidden rounded-3xl bg-white">{children}</View>
    </View>
  );
}

function SettingSwitchRow({ icon, label, description, value, onValueChange }) {
  return (
    <View className="flex-row items-center border-b border-neutral-100 px-4 py-4 last:border-b-0">
      <IconWrap>{icon}</IconWrap>
      <View className="ml-4 flex-1">
        <Text className="text-sm font-extrabold text-black">{label}</Text>
        <Text className="mt-1 text-xs font-semibold leading-4 text-neutral-500">
          {description}
        </Text>
      </View>
      <Switch
        trackColor={{ false: '#e5e5e7', true: '#9ce9ed' }}
        thumbColor={value ? '#11d8d8' : '#ffffff'}
        ios_backgroundColor="#e5e5e7"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function SettingActionRow({ icon, label, description, onPress }) {
  return (
    <Pressable
      className="flex-row items-center border-b border-neutral-100 px-4 py-4 last:border-b-0"
      style={({ pressed }) => [pressed && { backgroundColor: '#f4f4f5' }]}
      onPress={onPress}
    >
      <IconWrap>{icon}</IconWrap>
      <View className="ml-4 flex-1">
        <Text className="text-sm font-extrabold text-black">{label}</Text>
        <Text className="mt-1 text-xs font-semibold leading-4 text-neutral-500">
          {description}
        </Text>
      </View>
      <ChevronIcon />
    </Pressable>
  );
}

function IconWrap({ children }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f8]">
      {children}
    </View>
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

function getUserName(user) {
  return user?.full_name || user?.user_metadata?.full_name || user?.email || '';
}

function getUserAvatar(user) {
  return user?.avatar_url || user?.user_metadata?.avatar_url || '';
}

function getInitial(value) {
  return value?.trim()?.charAt(0)?.toUpperCase() || 'S';
}

function SvgIcon({ children, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

function BackIcon() {
  return (
    <SvgIcon size={18}>
      <Path
        d="M15 5 8 12l7 7"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

function MoreIcon() {
  return (
    <SvgIcon size={18}>
      <Circle cx="5" cy="12" r="1.5" fill="#111" />
      <Circle cx="12" cy="12" r="1.5" fill="#111" />
      <Circle cx="19" cy="12" r="1.5" fill="#111" />
    </SvgIcon>
  );
}

function MailIcon() {
  return (
    <SvgIcon>
      <Path
        d="M4 6h16v12H4V6Z"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <Path
        d="m4 7 8 6 8-6"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

function BellIcon() {
  return (
    <SvgIcon>
      <Path
        d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3v-4Z"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <Path
        d="M10 20a2.5 2.5 0 0 0 4 0"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

function ShieldIcon() {
  return (
    <SvgIcon>
      <Path
        d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <Path
        d="m9 12 2 2 4-5"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

function HelpIcon() {
  return (
    <SvgIcon>
      <Circle cx="12" cy="12" r="8" stroke="#111" strokeWidth="1.7" />
      <Path
        d="M9.8 9.2a2.4 2.4 0 0 1 4.6 1c0 1.7-2.4 1.8-2.4 3.4"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="17" r="1" fill="#111" />
    </SvgIcon>
  );
}

function DocumentIcon() {
  return (
    <SvgIcon>
      <Path
        d="M7 4h7l3 3v13H7V4Z"
        stroke="#111"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <Path d="M14 4v4h4" stroke="#111" strokeWidth="1.7" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function ChevronIcon() {
  return (
    <SvgIcon size={16}>
      <Path
        d="M9 5l5 7-5 7"
        stroke="#111"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}
