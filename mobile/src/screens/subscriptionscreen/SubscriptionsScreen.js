import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const COLORS = {
  black: '#111111',
  blue: '#0ca9f2',
  navy: '#19386e',
  white: '#ffffff',
};

export default function SubscriptionsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const totalMonthly = useMemo(
    () =>
      subscriptions.reduce((sum, item) => {
        const price = Number(item.price) || 0;

        if (item.billing_cycle === 'yearly') {
          return sum + price / 12;
        }

        return sum + price;
      }, 0),
    [subscriptions]
  );

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setErrorText('');

      const userId = await getStoredUserId();
      const response = await axios.get('/subscriptions', {
        params: userId ? { userId } : undefined,
      });

      setSubscriptions(response.data?.data || []);
    } catch (err) {
      console.log('Failed to load subscriptions:', err?.response?.data || err?.message);
      setErrorText('Nem sikerult betolteni az elofizeteseket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

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

          <Text className="text-base font-extrabold text-black">Elofizeteseim</Text>

          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-black" 
            onPress={() => navigation.navigate('SubscriptionsForm')}>
            <Text className="text-2xl leading-7 text-white">+</Text>
          </Pressable>
        </View>

        <View className="rounded-2xl bg-[#0ca9f2] px-5 py-5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-sm font-bold text-white/80">Havi osszesen</Text>
              <Text className="mt-1 text-4xl font-extrabold text-white">
                {formatMoney(totalMonthly)}
              </Text>
            </View>

            <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <WalletIcon />
            </View>
          </View>

          <View className="mt-5 flex-row">
            <SummaryPill label="Aktiv" value={String(subscriptions.length)} />
            <View className="w-3" />
            <SummaryPill label="Kovetkezo" value={getNextBillingLabel(subscriptions)} />
          </View>
        </View>

        <View className="mt-7">
          <Text className="mb-3 text-lg font-extrabold text-black">Lista</Text>

          {loading ? (
            <View className="mt-16 items-center">
              <ActivityIndicator color={COLORS.blue} size="large" />
              <Text className="mt-3 text-sm font-semibold text-neutral-500">
                Betoltes...
              </Text>
            </View>
          ) : errorText ? (
            <View className="mt-10 items-center rounded-2xl bg-white px-5 py-8">
              <ErrorIcon />
              <Text className="mt-4 text-center text-sm font-bold text-neutral-700">
                {errorText}
              </Text>
              <Pressable
                className="mt-5 rounded-full bg-black px-5 py-3"
                onPress={loadSubscriptions}
              >
                <Text className="text-sm font-extrabold text-white">Ujraprobalom</Text>
              </Pressable>
            </View>
          ) : subscriptions.length === 0 ? (
            <View className="mt-10 items-center rounded-2xl bg-white px-5 py-8">
              <EmptyIcon />
              <Text className="mt-4 text-center text-base font-extrabold text-black">
                Meg nincs elofizetesed
              </Text>
              <Text className="mt-2 text-center text-sm font-semibold leading-5 text-neutral-500">
                Add hozza az elso szolgaltatast, hogy egy helyen lasd a havi
                kiadasaidat.
              </Text>
            </View>
          ) : (
            subscriptions.map((item) => (
              <SubscriptionCard key={String(item.id)} subscription={item} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SubscriptionCard({ subscription }) {
  const name = subscription.name || 'Nevtelen elofizetes';
  const currency = subscription.currency || 'HUF';
  const billingCycle = getBillingCycleLabel(subscription.billing_cycle);
  const nextBilling = subscription.next_billing_date
    ? ` - ${subscription.next_billing_date}`
    : '';

  return (
    <Pressable
      className="mb-3 flex-row items-center rounded-2xl bg-white px-4 py-4"
      style={({ pressed }) => [pressed && { opacity: 0.86 }]}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-fox-cream">
        <SubscriptionIcon />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-base font-extrabold text-black">{name}</Text>
        <Text className="mt-1 text-xs font-semibold text-neutral-500">
          {billingCycle}
          {nextBilling}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-base font-extrabold text-black">
          {formatMoney(subscription.price, currency)}
        </Text>
        {subscription.is_shared ? (
          <Text className="mt-1 text-xs font-bold text-[#0ca9f2]">Megosztott</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SummaryPill({ label, value }) {
  return (
    <View className="flex-1 rounded-2xl bg-white/15 px-4 py-3">
      <Text className="text-xs font-bold text-white/75">{label}</Text>
      <Text className="mt-1 text-lg font-extrabold text-white">{value}</Text>
    </View>
  );
}

function formatMoney(value, currency = 'HUF') {
  const amount = Number(value) || 0;

  if (currency === 'HUF') {
    return `${Math.round(amount).toLocaleString('hu-HU')} Ft`;
  }

  return `${amount.toLocaleString('hu-HU')} ${currency}`;
}

function getBillingCycleLabel(value) {
  if (value === 'yearly') {
    return 'Eves';
  }

  if (value === 'weekly') {
    return 'Heti';
  }

  return 'Havi';
}

function getNextBillingLabel(items) {
  const dates = items
    .map((item) => item.next_billing_date)
    .filter(Boolean)
    .sort();

  return dates[0] || '-';
}

async function getStoredUserId() {
  const storedUser = storage.getString('appUser');

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);

      if (user?.id) {
        return user.id;
      }
    } catch (err) {
      console.log('Failed to parse stored user:', err?.message);
    }
  }

  const profileResponse = await axios.get('/profile');
  const profile = profileResponse.data?.data;

  if (profile) {
    storage.set('appUser', JSON.stringify(profile));
  }

  return profile?.id;
}

function SvgIcon({ children, size = 22 }) {
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
        stroke={COLORS.black}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

function WalletIcon() {
  return (
    <SvgIcon size={30}>
      <Path
        d="M4 7.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        stroke={COLORS.white}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path
        d="M16 12h4v4h-4a2 2 0 0 1 0-4Z"
        stroke={COLORS.white}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path
        d="M5 7.5 16 4v3.5"
        stroke={COLORS.white}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

function SubscriptionIcon() {
  return (
    <SvgIcon>
      <Rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="3"
        stroke={COLORS.navy}
        strokeWidth="1.8"
      />
      <Path
        d="M8 10h8M8 14h5"
        stroke={COLORS.navy}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

function EmptyIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx="40" cy="40" r="40" fill="#fff7e6" />
      <Path
        d="M24 34h32v18a5 5 0 0 1-5 5H29a5 5 0 0 1-5-5V34Z"
        fill={COLORS.blue}
      />
      <Path d="M30 34c0-7 4-11 10-11s10 4 10 11" stroke={COLORS.navy} strokeWidth="4" />
      <Circle cx="32" cy="43" r="2.5" fill={COLORS.white} />
      <Circle cx="48" cy="43" r="2.5" fill={COLORS.white} />
      <Path d="M34 50c4 4 8 4 12 0" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function ErrorIcon() {
  return (
    <Svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <Circle cx="29" cy="29" r="29" fill="#fee2e2" />
      <Path
        d="M22 22l14 14M36 22 22 36"
        stroke="#dc2626"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}
