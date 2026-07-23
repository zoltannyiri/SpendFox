import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { requestAndRegisterPushToken } from '../../services/push/PushTokenService';
import BottomNavigation from '../../components/layout/BottomNavigation';
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import AnimatedScreen from '../../components/layout/AnimatedScreen';

const storage = new MMKV();
const REMINDER_DAYS = [1, 2, 3, 5, 7];
const SHOW_NOTIFICATION_TEST_ACTIONS = __DEV__;

const DEFAULT_NOTIFICATION_SETTINGS = {
  email_enabled: false,
  push_enabled: false,
  days_before: 3,
  days_before_list: [3],
};

const normalizeReminderDays = (settings) => {
  const values = Array.isArray(settings?.days_before_list)
    ? settings.days_before_list
    : [settings?.days_before];
  const days = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const uniqueDays = [...new Set(days)].sort((a, b) => a - b);

  return uniqueDays.length ? uniqueDays : DEFAULT_NOTIFICATION_SETTINGS.days_before_list;
};

const normalizeNotificationSettings = (settings) => {
  const mergedSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(settings || {}),
  };
  const reminderDays = normalizeReminderDays(mergedSettings);

  return {
    ...mergedSettings,
    days_before: reminderDays[0],
    days_before_list: reminderDays,
  };
};

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const [profile, setProfileState] = useState(() => getStoredUser());
  const [notificationSettings, setNotificationSettings] = useState(() =>
    normalizeNotificationSettings(getStoredUser()?.notification_settings)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await axios.get('/profile');
        const freshProfile = response.data?.data;

        if (freshProfile) {
          saveProfileLocally(freshProfile);
          setProfileState(freshProfile);
          setNotificationSettings(
            normalizeNotificationSettings(freshProfile.notification_settings)
          );
        }
      } catch (err) {
        console.log('Failed to load profile:', err?.response?.data || err?.message);
      }
    };

    loadProfile();
  }, []);

  const profileName = getUserName(profile);
  const profileAvatar = getUserAvatar(profile);
  const profileEmail = profile?.email || '';

  const saveNotificationSettings = async (nextSettings) => {
    try {
      setSaving(true);
      setNotificationSettings(nextSettings);

      const response = await axios.patch('/profile', {
        notification_settings: nextSettings,
      });
      const freshProfile = response.data?.data;

      if (freshProfile) {
        saveProfileLocally(freshProfile);
        setProfileState(freshProfile);
      }
    } catch (err) {
      console.log('Failed to save notification settings:', err?.response?.data || err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePushChange = async (pushEnabled) => {
    if (pushEnabled) {
      const token = await requestAndRegisterPushToken();

      if (!token) {
        return;
      }
    }

    await saveNotificationSettings({
      ...notificationSettings,
      push_enabled: pushEnabled,
    });
  };

  const handleEmailChange = async (emailEnabled) => {
    await saveNotificationSettings({
      ...notificationSettings,
      email_enabled: emailEnabled,
    });
  };

  const handleReminderDaysChange = async (daysBefore) => {
    const currentDays = normalizeReminderDays(notificationSettings);
    const nextDays = currentDays.includes(daysBefore)
      ? currentDays.filter((day) => day !== daysBefore)
      : [...currentDays, daysBefore].sort((a, b) => a - b);
    const reminderDays = nextDays.length ? nextDays : [daysBefore];

    await saveNotificationSettings({
      ...notificationSettings,
      days_before: reminderDays[0],
      days_before_list: reminderDays,
    });
  };

  const handleDelayedPushTest = async () => {
    try {
      setSaving(true);

      const token = await requestAndRegisterPushToken();

      if (!token) {
        Alert.alert('Push teszt', 'Nem sikerült engedélyezni vagy regisztrálni a push tokent.');
        return;
      }

      await axios.post('/push/test-delayed');

      Alert.alert('Push teszt', 'Oké, 10 másodperc múlva küldöm az értesítést.');
    } catch (err) {
      console.log('Failed to schedule push test:', err?.response?.data || err?.message);
      Alert.alert('Push teszt', 'Nem sikerült elindítani a teszt értesítést.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailTest = async () => {
    try {
      setSaving(true);


      await axios.post('/email/test');

      Alert.alert('Email teszt', 'Email elküldve.');
    } catch (err) {
      console.log('Failed to schedule email test:', err?.response?.data || err?.message);
      Alert.alert('Email teszt', 'Nem sikerült elindítani a teszt emailt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f3f5f8]">
      <StatusBar barStyle="light-content" backgroundColor="#19386e" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-36"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="Profil beállítások"
          subtitle="Értesítések és fiókbeállítások"
          left={
            <HeaderIconButton onPress={() => navigation.goBack()}>
              <BackIcon />
            </HeaderIconButton>
          }
          // right={
          //   <HeaderIconButton>
          //     <MoreIcon />
          //   </HeaderIconButton>
          // }
        />

        <AnimatedScreen className="-mt-16 px-5">
          <View className="items-center rounded-[30px] bg-white px-5 py-7" style={cardShadow}>
            {profileAvatar ? (
              <Image
                source={{ uri: profileAvatar }}
                className="h-24 w-24 rounded-3xl bg-fox-cream"
                resizeMode="cover"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-3xl bg-fox-cream">
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
              style={({ pressed }) => [pressed && { opacity: 0.82 }]}
              onPress={() => navigation.navigate('ProfileSettingsForm')}
            >
              <Text className="text-sm font-extrabold text-white">Profil szerkesztése</Text>
            </Pressable>
          </View>

          <Section title="Értesítések">
            <SettingSwitchRow
              icon={<BellIcon />}
              label="Push értesítések"
              description="Előfizetés emlékeztetők a telefonodra"
              disabled={saving}
              value={notificationSettings.push_enabled}
              onValueChange={handlePushChange}
            />
            <SettingSwitchRow
              icon={<MailIcon />}
              label="Email értesítések"
              description="Előfizetés emlékeztetők emailben"
              disabled={saving}
              value={notificationSettings.email_enabled}
              onValueChange={handleEmailChange}
            />
            {(notificationSettings.push_enabled || notificationSettings.email_enabled) && (
              <ReminderDaysSelector
                value={notificationSettings.days_before_list}
                onChange={handleReminderDaysChange}
                disabled={saving}
              />
            )}
            {SHOW_NOTIFICATION_TEST_ACTIONS && (
              <>
                <Pressable
                  className={`mx-4 mb-4 h-12 items-center justify-center rounded-2xl ${
                    saving ? 'bg-neutral-300' : 'bg-black'
                  }`}
                  disabled={saving}
                  onPress={handleDelayedPushTest}
                >
                  <Text className="text-sm font-extrabold text-white">
                    Teszt push 10 másodperc múlva
                  </Text>
                </Pressable>
                <Pressable
                  className={`mx-4 mb-4 h-12 items-center justify-center rounded-2xl ${
                    saving ? 'bg-neutral-300' : 'bg-black'
                  }`}
                  disabled={saving}
                  onPress={handleEmailTest}
                >
                  <Text className="text-sm font-extrabold text-white">
                    Teszt email küldés
                  </Text>
                </Pressable>
              </>
            )}
          </Section>

          <Section title="Fiók">
            <SettingActionRow
              icon={<ShieldIcon />}
              label="Adatvédelem"
              description="Fiók és adatkezelési beállítások"
            />
            <SettingActionRow
              icon={<HelpIcon />}
              label="Segítség"
              description="Kapcsolat, hibajelentés és támogatás"
            />
            <SettingActionRow
              icon={<DocumentIcon />}
              label="Feltételek és adatvédelem"
              description="Jogi információk és szabályzatok"
            />
          </Section>

          <Pressable
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-red-50"
            onPress={() => window.App?.logout?.()}
          >
            <Text className="text-base font-extrabold text-red-600">Kijelentkezés</Text>
          </Pressable>
        </AnimatedScreen>
      </ScrollView>
      <BottomNavigation />
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 4,
};

function Section({ title, children }) {
  return (
    <View className="mt-7">
      <Text className="mb-3 text-xs font-extrabold uppercase tracking-wide text-neutral-400">
        {title}
      </Text>
      <View className="overflow-hidden rounded-[28px] bg-white" style={cardShadow}>
        {children}
      </View>
    </View>
  );
}

function SettingSwitchRow({ icon, label, description, value, onValueChange, disabled }) {
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
        disabled={disabled}
        trackColor={{ false: '#e5e5e7', true: '#9ce9ed' }}
        thumbColor={value ? '#11d8d8' : '#ffffff'}
        ios_backgroundColor="#e5e5e7"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function ReminderDaysSelector({ value, onChange, disabled }) {
  const selectedDays = Array.isArray(value) ? value : [value];

  return (
    <View className="border-t border-neutral-100 px-4 py-4">
      <Text className="text-sm font-extrabold text-black">Mikor küldjünk emlékeztetőt?</Text>
      <Text className="mt-1 text-xs font-semibold text-neutral-500">
        Az értesítés délelőtt 10:00-kor megy ki.
      </Text>
      <View className="mt-3 flex-row flex-wrap">
        {REMINDER_DAYS.map((days) => {
          const active = selectedDays.includes(days);

          return (
            <Pressable
              key={days}
              className={`mb-2 mr-2 rounded-full px-4 py-2 ${
                active ? 'bg-[#0ca9f2]' : 'bg-[#f7f7f8]'
              }`}
              disabled={disabled}
              onPress={() => onChange(days)}
            >
              <Text
                className={`text-sm font-extrabold ${
                  active ? 'text-white' : 'text-neutral-700'
                }`}
              >
                {days} nappal előtte
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#eef7ff]">
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

function saveProfileLocally(profile) {
  storage.set('appUser', JSON.stringify(profile));
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
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
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
