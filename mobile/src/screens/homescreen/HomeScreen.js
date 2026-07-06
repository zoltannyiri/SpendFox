import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import axios from 'axios';
import { Image } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import CurvedHeader from '../../components/layout/CurvedHeader';

const storage = new MMKV();

const MENU_ITEMS = [
  { label: 'Profil beállítások', icon: SettingsIcon, onPress: ({navigation}) => navigation.navigate('ProfileScreen') },
  { label: 'Előfizetéseim', icon: ErrorIcon, onPress: ({navigation}) => navigation.navigate('Subscriptions') },
  { label: 'Profil szerkesztése', icon: EditIcon, onPress: ({navigation}) => navigation.navigate('ProfileSettingsScreen') },
  { label: 'Kijelentkezés', icon: LogoutIcon, action: () => window.App?.logout?.() },
  // { label: 'Súgó', icon: HelpIcon },
];


export default function HomeScreen() {
  const navigation = useNavigation();
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      setProfileName(getUserName(storedUser));
      setProfileAvatar(getUserAvatar(storedUser));
    }

    const loadProfile = async () => {
      try {
        const response = await axios.get('/profile');
        const profile = response.data?.data;

        if (profile) {
          storage.set('appUser', JSON.stringify(profile));
          setProfileName(getUserName(profile));
          setProfileAvatar(getUserAvatar(profile));
        }
      } catch (err) {
        console.log('Failed to load profile:', err?.response?.data || err?.message);
      }
    };

    loadProfile();
  }, []);

  return (
    <View className="flex-1 bg-[#f7f7f8]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="SpendFox"
          right={
            <View className="flex-row rounded-2xl bg-white p-1">
              <IconButton>
                <SunIcon />
              </IconButton>
              <IconButton>
                <MoonIcon />
              </IconButton>
            </View>
          }
        />

        <View className="-mt-14 px-5">
        <View className="rounded-[28px] bg-white px-5 py-5 shadow-sm">
          <View className="flex-row items-center">
            {profileAvatar ? (
              <Image
                source={{ uri: profileAvatar }}
                className="h-20 w-20 rounded-full bg-fox-cream"
                resizeMode="cover"
              />
            ) : (
              <View className="h-20 w-20 rounded-full bg-fox-cream" />
            )}
            <View className="ml-4 flex-1">
              <Text className="text-xl font-extrabold text-black">
                {profileName || 'SpendFox user'}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-neutral-500">
                Kövessük együtt az előfizetéseidet.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          className="mt-9 flex-row items-center justify-between rounded-2xl bg-[#0ca9f2] px-5 py-5"
          style={({ pressed }) => [pressed && { opacity: 0.9 }]}
        >
          <View className="max-w-[72%]">
            <Text className="text-lg font-extrabold text-white">Subscribe card</Text>
            {/* <Text className="mt-1 text-xs font-semibold leading-4 text-white/80">
              Start your journey to becoming a better you.
            </Text> */}
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <SparkIcon />
          </View>
        </Pressable>

        <View className="mt-6">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Pressable
                key={item.label}
                className="mb-1 flex-row items-center rounded-2xl py-3"
                style={({ pressed }) => [pressed && { backgroundColor: '#eeeeef' }]}
                onPress={() => (item.action || item.onPress)?.({ navigation })}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon />
                </View>
                <Text className="ml-4 flex-1 text-sm font-extrabold text-neutral-900">
                  {item.label}
                </Text>
                <ChevronIcon />
              </Pressable>
            );
          })}
        </View>
        </View>
      </ScrollView>

      <BottomBar />
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

function IconButton({ children }) {
  return (
    <Pressable className="h-8 w-8 items-center justify-center rounded-full">
      {children}
    </Pressable>
  );
}

function BottomBar() {
  const navigation = useNavigation();
  return (
    <View className="absolute inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 px-6 pb-5 pt-3">
      <View className="flex-row items-center justify-between">
        <TabIcon active>
          <HomeIcon />
        </TabIcon>
        <TabIcon>
          <DocumentIcon />
        </TabIcon>
        <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-black" onPress={() => navigation.navigate('Subscriptions')}>
          <Text className="text-2xl leading-7 text-white">+</Text>
        </Pressable>
        <TabIcon onPress={() => navigation.navigate('ProfileScreen')}>
          <ProfileIcon />
        </TabIcon>
        <TabIcon>
          <MenuIcon />
        </TabIcon>
      </View>
    </View>
  );
}

function TabIcon({ children, onPress }) {
  return (
    <Pressable className="h-10 w-10 items-center justify-center" onPress={onPress}>
      {children}
    </Pressable>
  );
}

function SvgIcon({ children, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

function SunIcon() {
  return (
    <SvgIcon size={16}>
      <Circle cx="12" cy="12" r="3" stroke="#111" strokeWidth="1.8" />
      <Path d="M12 2.5V5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

function MoonIcon() {
  return (
    <SvgIcon size={16}>
      <Path d="M19 14.6A7 7 0 0 1 9.4 5a7.8 7.8 0 1 0 9.6 9.6Z" stroke="#111" strokeWidth="1.8" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function SparkIcon() {
  return (
    <SvgIcon size={30}>
      <Path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function SettingsIcon() {
  return (
    <SvgIcon>
      <Path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" stroke="#111" strokeWidth="1.7" />
      <Path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.3 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3h4l.3-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function ErrorIcon() {
  return (
    <SvgIcon>
      <Circle cx="12" cy="12" r="8" stroke="#111" strokeWidth="1.7" />
      <Path d="M9 9l6 6M15 9l-6 6" stroke="#111" strokeWidth="1.7" strokeLinecap="round" />
    </SvgIcon>
  );
}

function EditIcon() {
  return (
    <SvgIcon>
      <Path d="M5 18.5l4.2-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L5 18.5Z" stroke="#111" strokeWidth="1.7" strokeLinejoin="round" />
      <Path d="M13.8 6.7l3.5 3.5" stroke="#111" strokeWidth="1.7" strokeLinecap="round" />
    </SvgIcon>
  );
}

function LogoutIcon() {
  return (
    <SvgIcon>
      <Path d="M10 5H6v14h4" stroke="#111" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 8l4 4-4 4M18 12H9" stroke="#111" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function ChevronIcon() {
  return (
    <SvgIcon size={16}>
      <Path d="M9 5l5 7-5 7" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function HomeIcon() {
  return (
    <SvgIcon>
      <Path d="M4 11.5 12 4l8 7.5V20h-5v-5H9v5H4v-8.5Z" stroke="#8c8c92" strokeWidth="1.8" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function DocumentIcon() {
  return (
    <SvgIcon>
      <Path d="M7 4h7l3 3v13H7V4Z" stroke="#8c8c92" strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M14 4v4h4" stroke="#8c8c92" strokeWidth="1.8" strokeLinejoin="round" />
    </SvgIcon>
  );
}

function ProfileIcon() {
  return (
    <SvgIcon>
      <Circle cx="12" cy="8" r="3" stroke="#111" strokeWidth="1.8" />
      <Path d="M6 20c.9-4 3-6 6-6s5.1 2 6 6" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

function MenuIcon() {
  return (
    <SvgIcon>
      <Path d="M5 7h14M5 12h14M5 17h14" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}
