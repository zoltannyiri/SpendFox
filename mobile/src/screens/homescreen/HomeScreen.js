import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import CurvedHeader from '../../components/layout/CurvedHeader';
import BottomNavigation from '../../components/layout/BottomNavigation';

const storage = new MMKV();

export default function HomeScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(() => getStoredUser());
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const profileResponse = await axios.get('/profile');
      const freshProfile = profileResponse.data?.data;

      if (freshProfile) {
        storage.set('appUser', JSON.stringify(freshProfile));
        setProfile(freshProfile);
      }

      const userId = freshProfile?.id || getStoredUser()?.id;
      const subscriptionsResponse = await axios.get('/subscriptions', {
        params: userId ? { userId } : undefined,
      });

      setSubscriptions(subscriptionsResponse.data?.data || []);
    } catch (err) {
      console.log('Failed to load home dashboard:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const profileName = getUserName(profile);
  const profileAvatar = getUserAvatar(profile);
  const summary = useMemo(() => getSubscriptionSummary(subscriptions), [subscriptions]);
  const nextBilling = useMemo(() => getNextBilling(subscriptions), [subscriptions]);

  return (
    <View className="flex-1 bg-[#f7f7f8]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="SpendFox"
          right={
            <Pressable
              className="h-12 w-12 items-center justify-center rounded-2xl bg-white"
              onPress={() => navigation.navigate('ProfileSettingsScreen')}
            >
              <SettingsIcon />
            </Pressable>
          }
        >
          <Text className="mt-4 text-center text-sm font-semibold text-white/75">
            Tartsd kézben az előfizetéseidet egy helyen.
          </Text>
        </CurvedHeader>

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
                <View className="h-20 w-20 items-center justify-center rounded-full bg-fox-cream">
                  <Text className="text-3xl font-extrabold text-[#19386e]">
                    {getInitial(profileName)}
                  </Text>
                </View>
              )}

              <View className="ml-4 flex-1">
                <Text className="text-xs font-extrabold uppercase text-neutral-400">
                  Üdv újra
                </Text>
                <Text className="mt-1 text-2xl font-extrabold text-black">
                  {profileName || 'SpendFox user'}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-neutral-500">
                  {summary.activeCount} aktív előfizetésed van.
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-[28px] bg-[#0ca9f2] px-5 py-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-bold text-white/80">Havi kiadás</Text>
                <Text className="mt-1 text-4xl font-extrabold text-white">
                  {formatMoney(summary.monthlyTotal)}
                </Text>
              </View>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <WalletIcon />
              </View>
            </View>

            <View className="mt-5 flex-row">
              <SummaryPill label="Éves becslés" value={formatMoney(summary.yearlyTotal)} />
              <View className="w-3" />
              <SummaryPill
                label="Következő"
                value={nextBilling ? formatDateOnly(nextBilling.date) : '-'}
              />
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap justify-between">
            <MetricCard
              icon={<SubscriptionsIcon />}
              label="Összes"
              value={String(subscriptions.length)}
              note={`${summary.inactiveCount} inaktív`}
            />
            <MetricCard
              icon={<CalendarIcon />}
              label="Következő fizetés"
              value={nextBilling?.name || '-'}
              note={nextBilling ? formatDateOnly(nextBilling.date) : 'Nincs dátum'}
            />
          </View>

          <View className="mt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-black">Gyors műveletek</Text>
              {loading ? <ActivityIndicator color="#0ca9f2" size="small" /> : null}
            </View>

            <View className="overflow-hidden rounded-[28px] bg-white">
              <ActionRow
                icon={<PlusIcon />}
                label="Új előfizetés"
                description="Szolgáltatás, ár és ciklus hozzáadása"
                onPress={() => navigation.navigate('SubscriptionsForm')}
              />
              <ActionRow
                icon={<SubscriptionsIcon />}
                label="Előfizetéseim"
                description="Lista, módosítás és törlés"
                onPress={() => navigation.navigate('Subscriptions')}
              />
              <ActionRow
                icon={<ProfileIcon />}
                label="Profil"
                description="Összegzés és fiókadatok"
                onPress={() => navigation.navigate('ProfileScreen')}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

function getSubscriptionSummary(items) {
  return items.reduce(
    (summary, item) => {
      const price = Number(item.price) || 0;
      const isActive = item.is_active !== false;

      if (!isActive) {
        return {
          ...summary,
          inactiveCount: summary.inactiveCount + 1,
        };
      }

      const monthlyPrice =
        item.billing_cycle === 'yearly'
          ? price / 12
          : item.billing_cycle === 'weekly'
            ? price * 4
            : price;

      return {
        activeCount: summary.activeCount + 1,
        inactiveCount: summary.inactiveCount,
        monthlyTotal: summary.monthlyTotal + monthlyPrice,
        yearlyTotal: summary.yearlyTotal + monthlyPrice * 12,
      };
    },
    {
      activeCount: 0,
      inactiveCount: 0,
      monthlyTotal: 0,
      yearlyTotal: 0,
    }
  );
}

function getNextBilling(items) {
  return items
    .filter((item) => item.is_active !== false)
    .map((item) => ({
      name: item.name || 'Előfizetés',
      date: parseDateValue(item.next_billing_date || item.start_date),
    }))
    .filter((item) => item.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && typeof value._seconds === 'number') {
    return new Date(value._seconds * 1000);
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date) {
  return date.toLocaleDateString('hu-HU', {
    day: '2-digit',
    month: 'short',
  });
}

function formatMoney(value, currency = 'HUF') {
  const amount = Number(value) || 0;

  if (currency === 'HUF') {
    return `${Math.round(amount).toLocaleString('hu-HU')} Ft`;
  }

  return `${amount.toLocaleString('hu-HU')} ${currency}`;
}

function SummaryPill({ label, value }) {
  return (
    <View className="flex-1 rounded-2xl bg-white/15 px-4 py-3">
      <Text className="text-xs font-bold text-white/75">{label}</Text>
      <Text className="mt-1 text-lg font-extrabold text-white">{value}</Text>
    </View>
  );
}

function MetricCard({ icon, label, value, note }) {
  return (
    <View className="mb-3 min-h-[128px] w-[48%] justify-between rounded-3xl bg-white p-4">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#eef7ff]">
        {icon}
      </View>
      <View>
        <Text className="text-lg font-extrabold text-black" numberOfLines={1}>
          {value}
        </Text>
        <Text className="mt-1 text-xs font-extrabold text-neutral-900">{label}</Text>
        <Text className="mt-1 text-xs font-semibold text-neutral-500" numberOfLines={1}>
          {note}
        </Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, description, onPress }) {
  return (
    <Pressable
      className="flex-row items-center border-b border-neutral-100 px-4 py-4 last:border-b-0"
      style={({ pressed }) => [pressed && { backgroundColor: '#f4f4f5' }]}
      onPress={onPress}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f8]">
        {icon}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-sm font-extrabold text-black">{label}</Text>
        <Text className="mt-1 text-xs font-semibold text-neutral-500">{description}</Text>
      </View>
      <ChevronIcon />
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

function getUserName(user) {
  return user?.full_name || user?.user_metadata?.full_name || user?.email || '';
}

function getUserAvatar(user) {
  return user?.avatar_url || user?.user_metadata?.avatar_url || '';
}

function getInitial(value) {
  return value?.trim()?.charAt(0)?.toUpperCase() || 'S';
}

function SvgIcon({ children, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

function SettingsIcon() {
  return (
    <SvgIcon size={19}>
      <Circle cx="12" cy="12" r="3" stroke="#111" strokeWidth="1.8" />
      <Path
        d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3h5l.3-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
        stroke="#111"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </SvgIcon>
  );
}

function WalletIcon() {
  return (
    <SvgIcon size={30}>
      <Path
        d="M4 7.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        stroke="#fff"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <Path
        d="M16 12h4v4h-4a2 2 0 0 1 0-4Z"
        stroke="#fff"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <Path d="M5 7.5 16 4v3.5" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" />
    </SvgIcon>
  );
}

function SubscriptionsIcon() {
  return (
    <SvgIcon>
      <Rect x="4" y="5" width="16" height="14" rx="3" stroke="#19386e" strokeWidth="1.8" />
      <Path d="M8 10h8M8 14h5" stroke="#19386e" strokeLinecap="round" strokeWidth="1.8" />
    </SvgIcon>
  );
}

function CalendarIcon() {
  return (
    <SvgIcon>
      <Rect x="4" y="5" width="16" height="15" rx="3" stroke="#19386e" strokeWidth="1.8" />
      <Path d="M8 3v4M16 3v4M4 10h16" stroke="#19386e" strokeLinecap="round" strokeWidth="1.8" />
    </SvgIcon>
  );
}

function PlusIcon() {
  return (
    <SvgIcon>
      <Circle cx="12" cy="12" r="8" stroke="#111" strokeWidth="1.8" />
      <Path d="M12 8v8M8 12h8" stroke="#111" strokeLinecap="round" strokeWidth="1.8" />
    </SvgIcon>
  );
}

function ProfileIcon() {
  return (
    <SvgIcon>
      <Circle cx="12" cy="8" r="3" stroke="#19386e" strokeWidth="1.8" />
      <Path
        d="M6 20c.9-4 3-6 6-6s5.1 2 6 6"
        stroke="#19386e"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}

function ChevronIcon() {
  return (
    <SvgIcon size={16}>
      <Path
        d="M9 5l5 7-5 7"
        stroke="#111"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}
