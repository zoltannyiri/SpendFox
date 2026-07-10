import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { useFocusEffect } from '@react-navigation/native';
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import BottomNavigation from '../../components/layout/BottomNavigation';
import AnimatedScreen from '../../components/layout/AnimatedScreen';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState(null);
  const [errorText, setErrorText] = useState('');

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((item) => item.is_active !== false),
    [subscriptions]
  );

  const loadedTotalMonthly = useMemo(
    () =>
      activeSubscriptions.reduce((sum, item) => {
        const price = getPriceInHuf(item);

        if (item.billing_cycle === 'yearly') {
          return sum + price / 12;
        }

        if (item.billing_cycle === 'weekly') {
          return sum + price * 4;
        }

        return sum + price;
      }, 0),
    [activeSubscriptions]
  );

  const loadedTotalYearly = useMemo(
    () =>
      activeSubscriptions.reduce((sum, item) => {
        const price = getPriceInHuf(item);

        if (item.billing_cycle === 'monthly') {
          return sum + price * 12;
        }

        if (item.billing_cycle === 'weekly') {
          return sum + price * 52;
        }

        return sum + price;
      }, 0),
    [activeSubscriptions]
  );

  const totalMonthly = summary?.monthlyTotal ?? loadedTotalMonthly;
  const totalYearly = summary?.yearlyTotal ?? loadedTotalYearly;

  const loadSubscriptions = useCallback(async ({ cursor = null, append = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setErrorText('');

      const userId = await getStoredUserId();
      const response = await axios.get('/subscriptions', {
        params: {
          ...(userId ? { userId } : {}),
          limit: 6,
          ...(cursor ? { cursor } : {}),
          includeSummary: append ? 'false' : 'true',
        },
      });

      const nextItems = response.data?.data || [];

      setSubscriptions((currentItems) =>
        append ? [...currentItems, ...nextItems] : nextItems
      );
      setNextCursor(response.data?.pagination?.nextCursor || null);
      setHasMore(Boolean(response.data?.pagination?.hasMore));

      if (!append && response.data?.summary) {
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.log('Failed to load subscriptions:', err?.response?.data || err?.message);
      setErrorText('Nem sikerült betölteni az előfizetéseket.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMoreSubscriptions = useCallback(() => {
    if (!hasMore || !nextCursor || loading || loadingMore) {
      return;
    }

    loadSubscriptions({ cursor: nextCursor, append: true });
  }, [hasMore, loadSubscriptions, loading, loadingMore, nextCursor]);

  const handleListScroll = useCallback(
    ({ nativeEvent }) => {
      const paddingToBottom = 160;
      const isCloseToBottom =
        nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
        nativeEvent.contentSize.height - paddingToBottom;

      if (isCloseToBottom) {
        loadMoreSubscriptions();
      }
    },
    [loadMoreSubscriptions]
  );

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, [loadSubscriptions])
  );

  return (
    <View className="flex-1 bg-[#f3f5f8]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-36"
        onScroll={handleListScroll}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="Előfizetéseim"
          subtitle="Kiadások, dátumok és állapotok"
          left={
            <HeaderIconButton onPress={() => navigation.goBack()}>
              <BackIcon />
            </HeaderIconButton>
          }
          right={
            <HeaderIconButton dark onPress={() => navigation.navigate('SubscriptionsForm')}>
              <Text className="text-2xl leading-7 text-white">+</Text>
            </HeaderIconButton>
          }
        />

        <AnimatedScreen className="-mt-16 px-5">
          <View className="rounded-[30px] bg-[#0ca9f2] px-5 py-5" style={blueShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-bold text-white/80">
                  Havi előfizetések összesen
                </Text>
                <Text className="mt-1 text-4xl font-extrabold text-white">
                  {formatMoney(totalMonthly)}
                </Text>
              </View>

              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <WalletIcon />
              </View>
            </View>

            <View className="mt-5 flex-row">
              <SummaryPill label="Éves összesen" value={formatMoney(totalYearly)} />
              <View className="w-3" />
              <SummaryPill label="Következő" value={getNextBillingLabel(subscriptions)} />
            </View>
          </View>

          <View className="mt-7">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-black">Lista</Text>
              {loading ? <ActivityIndicator color={COLORS.blue} size="small" /> : null}
            </View>

            {loading ? (
              <View className="mt-16 items-center">
                <ActivityIndicator color={COLORS.blue} size="large" />
                <Text className="mt-3 text-sm font-semibold text-neutral-500">
                  Betöltés...
                </Text>
              </View>
            ) : errorText ? (
              <View className="mt-10 items-center rounded-[28px] bg-white px-5 py-8" style={cardShadow}>
                <ErrorIcon />
                <Text className="mt-4 text-center text-sm font-bold text-neutral-700">
                  {errorText}
                </Text>
                <Pressable
                  className="mt-5 rounded-full bg-black px-5 py-3"
                  onPress={loadSubscriptions}
                >
                  <Text className="text-sm font-extrabold text-white">Újrapróbálom</Text>
                </Pressable>
              </View>
            ) : subscriptions.length === 0 ? (
              <View className="mt-10 items-center rounded-[28px] bg-white px-5 py-8" style={cardShadow}>
                <EmptyIcon />
                <Text className="mt-4 text-center text-base font-extrabold text-black">
                  Még nincs előfizetésed
                </Text>
                <Text className="mt-2 text-center text-sm font-semibold leading-5 text-neutral-500">
                  Add hozzá az első szolgáltatást, hogy egy helyen lásd a havi kiadásaidat.
                </Text>
                <Pressable
                  className="mt-5 rounded-full bg-black px-5 py-3"
                  onPress={() => navigation.navigate('SubscriptionsForm')}
                >
                  <Text className="text-sm font-extrabold text-white">Hozzáadás</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {subscriptions.map((item) => (
                  <SubscriptionCard
                    key={String(item.id)}
                    subscription={item}
                    onEdit={() =>
                      navigation.navigate('SubscriptionsForm', {
                        subscription: item,
                      })
                    }
                  />
                ))}

                {loadingMore ? (
                  <View className="items-center py-5">
                    <ActivityIndicator color={COLORS.blue} size="small" />
                  </View>
                ) : null}
              </>
            )}
          </View>
        </AnimatedScreen>
      </ScrollView>
      <BottomNavigation />
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 4,
};

const blueShadow = {
  shadowColor: '#0ca9f2',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.2,
  shadowRadius: 20,
  elevation: 5,
};

function SubscriptionCard({ subscription, onEdit }) {
  const name = subscription.name || 'Névtelen előfizetés';
  const currency = subscription.currency || 'HUF';
  const priceHuf = getPriceInHuf(subscription);
  const categoryLabel = getCategoryLabel(subscription.category);
  const billingCycle = getBillingCycleLabel(subscription.billing_cycle);
  const logoUrl = subscription.logo_url;
  const nextBilling = subscription.next_billing_date
    ? `Következő fizetés: ${formatDateOnly(parseDateValue(subscription.next_billing_date))}`
    : '';

  return (
    <Pressable
      className="mb-3 flex-row items-center rounded-[26px] bg-white px-4 py-4"
      style={({ pressed }) => [cardShadow, pressed && { opacity: 0.88 }]}
      onPress={onEdit}
    >
      <SubscriptionLogo logoUrl={logoUrl} />

      <View className="ml-4 flex-1">
        <Text className="text-base font-extrabold text-black" numberOfLines={1}>{name}</Text>
        <Text className="mt-1 text-xs font-semibold text-neutral-500">{billingCycle}</Text>
        <Text className="mt-1 text-xs font-bold text-[#0ca9f2]">{categoryLabel}</Text>
        {!!nextBilling && (
          <Text className="mt-1 text-xs font-semibold text-neutral-500" numberOfLines={1}>
            {nextBilling}
          </Text>
        )}
      </View>

      <View className="items-end">
        <Text className="text-base font-extrabold text-black">
          {formatMoney(subscription.price, currency)}
        </Text>
        {currency !== 'HUF' && priceHuf > 0 ? (
          <Text className="mt-1 text-xs font-bold text-neutral-500">
            {formatMoney(priceHuf)}
          </Text>
        ) : null}
        {subscription.is_shared ? (
          <Text className="mt-1 text-xs font-bold text-[#0ca9f2]">Megosztott</Text>
        ) : null}
        <Text className="mt-2 text-xs font-extrabold text-neutral-400">Módosít</Text>
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

function SubscriptionLogo({ logoUrl }) {
  const [failed, setFailed] = useState(false);

  return (
    <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#eef7ff]">
      {logoUrl && !failed ? (
        <Image
          source={{ uri: logoUrl }}
          className="h-full w-full"
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <SubscriptionIcon />
      )}
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

function getPriceInHuf(item) {
  const convertedPrice = Number(item.price_huf);

  if (!Number.isNaN(convertedPrice)) {
    return convertedPrice;
  }

  if ((item.currency || 'HUF') === 'HUF') {
    return Number(item.price) || 0;
  }

  return 0;
}

function getBillingCycleLabel(value) {
  if (value === 'yearly') {
    return 'Éves';
  }

  if (value === 'weekly') {
    return 'Heti';
  }

  return 'Havi';
}

function getCategoryLabel(value) {
  const categories = {
    streaming: 'Streaming',
    work: 'Munka',
    'ai-tool': 'AI tool',
    hosting: 'Tárhely',
    mobile: 'Mobil',
    bank: 'Bank',
    gaming: 'Játék',
    other: 'Egyéb',
  };

  return categories[value] || 'Egyéb';
}

function getNextBillingLabel(items) {
  const today = startOfDay(new Date());
  const dates = items
    .filter((item) => item.is_active !== false)
    .map((item) => getNextBillingDate(item, today))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  return dates[0] ? formatDateOnly(dates[0]) : '-';
}

function getNextBillingDate(item, today) {
  const billingDate = parseDateValue(item.next_billing_date || item.start_date);

  if (!billingDate) {
    return null;
  }

  if (item.billing_cycle === 'monthly') {
    return getNextMonthlyBillingDate(billingDate, today);
  }

  const date = startOfDay(billingDate);

  return date >= today ? date : null;
}

function getNextMonthlyBillingDate(sourceDate, today) {
  const paymentDay = sourceDate.getDate();
  let candidate = createDateWithClampedDay(
    today.getFullYear(),
    today.getMonth(),
    paymentDay
  );

  if (candidate <= today) {
    candidate = createDateWithClampedDay(
      today.getFullYear(),
      today.getMonth() + 1,
      paymentDay
    );
  }

  return candidate;
}

function createDateWithClampedDay(year, month, day) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfMonth));
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly(date) {
  if (!date) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
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
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <Path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" stroke={COLORS.white} strokeLinejoin="round" strokeWidth="1.8" />
      <Path d="M5 7.5 16 4v3.5" stroke={COLORS.white} strokeLinecap="round" strokeWidth="1.8" />
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
      <Path d="M8 10h8M8 14h5" stroke={COLORS.navy} strokeLinecap="round" strokeWidth="1.8" />
    </SvgIcon>
  );
}

function EmptyIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx="40" cy="40" r="40" fill="#fff7e6" />
      <Path d="M24 34h32v18a5 5 0 0 1-5 5H29a5 5 0 0 1-5-5V34Z" fill={COLORS.blue} />
      <Path d="M30 34c0-7 4-11 10-11s10 4 10 11" stroke={COLORS.navy} strokeWidth="4" />
      <Circle cx="32" cy="43" r="2.5" fill={COLORS.white} />
      <Circle cx="48" cy="43" r="2.5" fill={COLORS.white} />
      <Path d="M34 50c4 4 8 4 12 0" stroke={COLORS.white} strokeLinecap="round" strokeWidth="3" />
    </Svg>
  );
}

function ErrorIcon() {
  return (
    <Svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <Circle cx="29" cy="29" r="29" fill="#fee2e2" />
      <Path d="M22 22l14 14M36 22 22 36" stroke="#dc2626" strokeLinecap="round" strokeWidth="3" />
    </Svg>
  );
}
