import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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

const FALLBACK_CATEGORIES = [
  { code: 'streaming', name: 'Streaming' },
  { code: 'work', name: 'Munka' },
  { code: 'ai-tool', name: 'AI tool' },
  { code: 'hosting', name: 'Tárhely' },
  { code: 'mobile', name: 'Mobil' },
  { code: 'bank', name: 'Bank' },
  { code: 'gaming', name: 'Játék' },
  { code: 'other', name: 'Egyéb' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Mind' },
  { value: 'active', label: 'Aktív' },
  { value: 'inactive', label: 'Inaktív' },
];

const BILLING_CYCLE_OPTIONS = [
  { value: 'all', label: 'Minden ciklus' },
  { value: 'monthly', label: 'Havi' },
  { value: 'yearly', label: 'Éves' },
  { value: 'weekly', label: 'Heti' },
];

export default function SubscriptionsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [billingCycleFilter, setBillingCycleFilter] = useState('all');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

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
  const categoryOptions = useMemo(
    () => [
      { code: 'all', name: 'Minden kategória' },
      ...categories,
    ],
    [categories]
  );

  const loadCategories = useCallback(async () => {
    try {
      const response = await axios.get('/dictionary/subscription-category');
      const nextCategories = (response.data?.data || [])
        .map((item) => ({
          code: item.code || item.id,
          name: item.name || item.label || item.code || item.id,
        }))
        .filter((item) => item.code && item.name);

      if (nextCategories.length > 0) {
        setCategories(nextCategories);
      }
    } catch (err) {
      console.log('Failed to load subscription categories:', err?.response?.data || err?.message);
    }
  }, []);

  const loadSubscriptions = useCallback(async ({ cursor = null, append = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setSelectedSubscriptionId(null);
      }
      setErrorText('');

      const userId = await getStoredUserId();
      const response = await axios.get('/subscriptions', {
        params: {
          ...(userId ? { userId } : {}),
          limit: 6,
          ...(cursor ? { cursor } : {}),
          includeSummary: append ? 'false' : 'true',
          ...(debouncedSearchText ? { search: debouncedSearchText } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
          ...(billingCycleFilter !== 'all' ? { billingCycle: billingCycleFilter } : {}),
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
  }, [billingCycleFilter, categoryFilter, debouncedSearchText, statusFilter]);

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

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

          <FilterPanel
            searchText={searchText}
            onSearchTextChange={setSearchText}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            billingCycleFilter={billingCycleFilter}
            onBillingCycleFilterChange={setBillingCycleFilter}
            categoryOptions={categoryOptions}
          />

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
                  Nincs találat
                </Text>
                <Text className="mt-2 text-center text-sm font-semibold leading-5 text-neutral-500">
                  Próbálj más keresést vagy szűrőt, esetleg adj hozzá új előfizetést.
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
                  <React.Fragment key={String(item.id)}>
                    <SubscriptionCard
                      subscription={item}
                      isOpen={String(selectedSubscriptionId) === String(item.id)}
                      onOpenDetails={() =>
                        setSelectedSubscriptionId((currentId) =>
                          String(currentId) === String(item.id) ? null : item.id
                        )
                      }
                    />
                    {String(selectedSubscriptionId) === String(item.id) ? (
                      <SubscriptionDetailCard
                        subscription={item}
                        onClose={() => setSelectedSubscriptionId(null)}
                        onEdit={() =>
                          navigation.navigate('SubscriptionsForm', {
                            subscription: item,
                          })
                        }
                        onOpenShare={() =>
                          navigation.navigate('SubscriptionShare', {
                            subscription: item,
                            subscriptionId: item.id,
                          })
                        }
                      />
                    ) : null}
                  </React.Fragment>
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

function FilterPanel({
  searchText,
  onSearchTextChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  billingCycleFilter,
  onBillingCycleFilterChange,
  categoryOptions,
}) {
  return (
    <View className="mt-5 rounded-[28px] bg-white p-4" style={cardShadow}>
      <Text className="text-sm font-extrabold text-black">Keresés és szűrés</Text>
      <TextInput
        className="mt-3 rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-semibold text-black"
        placeholder="Keresés név alapján"
        placeholderTextColor="#9ca3af"
        value={searchText}
        onChangeText={onSearchTextChange}
      />

      <View className="mt-4 flex-row rounded-2xl bg-[#f3f5f8] p-1">
        {STATUS_OPTIONS.map((option) => (
          <FilterSegment
            key={option.value}
            active={statusFilter === option.value}
            label={option.label}
            onPress={() => onStatusFilterChange(option.value)}
          />
        ))}
      </View>

      <ScrollView
        className="mt-4"
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categoryOptions.map((option) => (
          <FilterChip
            key={option.code}
            active={categoryFilter === option.code}
            label={option.name}
            onPress={() => onCategoryFilterChange(option.code)}
          />
        ))}
      </ScrollView>

      <ScrollView
        className="mt-3"
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {BILLING_CYCLE_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            active={billingCycleFilter === option.value}
            label={option.label}
            onPress={() => onBillingCycleFilterChange(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilterSegment({ active, label, onPress }) {
  return (
    <Pressable
      className={`flex-1 rounded-xl px-3 py-3 ${active ? 'bg-white' : ''}`}
      onPress={onPress}
    >
      <Text
        className={`text-center text-xs font-extrabold ${
          active ? 'text-[#0ca9f2]' : 'text-neutral-500'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({ active, label, onPress }) {
  return (
    <Pressable
      className={`mr-2 rounded-full px-4 py-2 ${
        active ? 'bg-[#0ca9f2]' : 'bg-[#f3f5f8]'
      }`}
      onPress={onPress}
    >
      <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-neutral-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SubscriptionDetailCard({ subscription, onClose, onEdit, onOpenShare }) {
  const currency = subscription.currency || 'HUF';
  const annualPrice = getAnnualPriceInHuf(subscription);
  const nextBillingDate = getNextBillingDate(subscription, startOfDay(new Date()));
  const categoryLabel = getCategoryLabel(subscription.category);
  const rate = Number(subscription.exchange_rate_to_huf);
  const hasRate = currency !== 'HUF' && !Number.isNaN(rate) && rate > 0;
  const sharedParticipantCount = getSharedParticipantCount(subscription);
  const mySharePrice = getSharedSharePrice(subscription);
  const trialEndDate = subscription.trial_enabled && subscription.trial_end_date
    ? parseDateValue(subscription.trial_end_date)
    : null;

  return (
    <View className="mb-4 rounded-[30px] bg-white p-5" style={cardShadow}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-extrabold uppercase text-neutral-400">
            Részletek
          </Text>
          <Text className="mt-1 text-2xl font-extrabold text-black" numberOfLines={1}>
            {subscription.name || 'Névtelen előfizetés'}
          </Text>
          <Text className="mt-1 text-sm font-bold text-[#0ca9f2]">
            {categoryLabel} · {getBillingCycleLabel(subscription.billing_cycle)}
          </Text>
        </View>
        <Pressable className="rounded-full bg-[#f3f5f8] px-3 py-2" onPress={onClose}>
          <Text className="text-xs font-extrabold text-neutral-600">Bezár</Text>
        </Pressable>
      </View>

      <View className="mt-5 flex-row flex-wrap justify-between">
        {!trialEndDate && (
          <DetailStat label="Következő fizetés" value={formatDateOnly(nextBillingDate)} />
        )}
        <DetailStat label="Éves becslés" value={formatMoney(annualPrice)} />
        <DetailStat label="Eredeti ár" value={formatMoney(subscription.price, currency)} />
        <DetailStat
          label="Árfolyam"
          value={hasRate ? `1 ${currency} = ${Math.round(rate)} Ft` : 'HUF'}
        />
        {trialEndDate ? (
          <DetailStat label="Próbaidő vége" value={formatDateOnly(trialEndDate)} />
        ) : null}
      </View>

      {/* <View className="mt-4 rounded-2xl bg-[#f3f5f8] px-4 py-3">
        <Text className="text-xs font-bold text-neutral-500">Értesítés státusz</Text>
        <Text className="mt-1 text-sm font-extrabold text-black">
          Profilbeállítás szerint
        </Text>
      </View> */}

      {subscription.is_shared ? (
        <View className="mt-2 rounded-2xl bg-[#eef7ff] px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-extrabold text-black">Megosztott előfizetés</Text>
              <Text className="mt-1 text-xs font-semibold leading-5 text-neutral-500">
                Résztvevők, saját részek, státuszok és közös chat.
              </Text>
              <Text className="mt-2 text-xs font-extrabold text-[#0ca9f2]">
                Saját részed: {formatMoney(mySharePrice)}
              </Text>
            </View>
            <Text className="rounded-full bg-white px-3 py-2 text-xs font-extrabold text-[#0ca9f2]">
              {sharedParticipantCount} fő
            </Text>
          </View>
          <Pressable className="mt-4 rounded-2xl bg-[#0ca9f2] py-4" onPress={onOpenShare}>
            <Text className="text-center text-sm font-extrabold text-white">
              Közös oldal megnyitása
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable className="mt-4 rounded-2xl bg-black py-4" onPress={onEdit}>
        <Text className="text-center text-sm font-extrabold text-white">Módosítás</Text>
      </Pressable>
    </View>
  );
}

function DetailStat({ label, value }) {
  return (
    <View className="mb-3 w-[48%] rounded-2xl bg-[#f3f5f8] px-4 py-3">
      <Text className="text-xs font-bold text-neutral-500">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-black" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SubscriptionCard({ subscription, isOpen, onOpenDetails }) {
  const name = subscription.name || 'Névtelen előfizetés';
  const currency = subscription.currency || 'HUF';
  const priceHuf = getPriceInHuf(subscription);
  const categoryLabel = getCategoryLabel(subscription.category);
  const billingCycle = getBillingCycleLabel(subscription.billing_cycle);
  const logoUrl = subscription.logo_url;
  const sharedParticipantCount = getSharedParticipantCount(subscription);
  const mySharePrice = getSharedSharePrice(subscription);
  const trialEndDate = subscription.trial_enabled && subscription.trial_end_date
    ? parseDateValue(subscription.trial_end_date)
    : null;
  const computedNextBillingDate = getNextBillingDate(subscription, startOfDay(new Date()));
  const nextBilling = computedNextBillingDate
    ? `Következő fizetés: ${formatDateOnly(computedNextBillingDate)}`
    : '';
  const trialLabel = trialEndDate
    ? `Próbaidő vége: ${formatDateOnly(trialEndDate)}`
    : '';

  return (
    <Pressable
      className={`mb-3 flex-row items-center rounded-[26px] px-4 py-4 ${
        isOpen ? 'bg-[#eef7ff]' : 'bg-white'
      }`}
      style={({ pressed }) => [
        cardShadow,
        isOpen && { borderWidth: 1, borderColor: '#0ca9f2' },
        pressed && { opacity: 0.88 },
      ]}
      onPress={onOpenDetails}
    >
      <SubscriptionLogo logoUrl={logoUrl} />

      <View className="ml-4 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-base font-extrabold text-black" numberOfLines={1}>
            {name}
          </Text>
          {trialEndDate ? <TrialBadge /> : null}
        </View>
        <Text className="mt-1 text-xs font-semibold text-neutral-500">{billingCycle}</Text>
        <Text className="mt-1 text-xs font-bold text-[#0ca9f2]">{categoryLabel}</Text>
        {!!trialLabel && (
          <Text className="mt-1 text-xs font-extrabold text-orange-500" numberOfLines={1}>
            {trialLabel}
          </Text>
        )}
        {!trialEndDate && !!nextBilling && (
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
          <>
            <Text className="mt-1 text-xs font-bold text-[#0ca9f2]">
              Közös · {sharedParticipantCount} fő
            </Text>
            <Text className="mt-1 text-xs font-bold text-neutral-500">
              Saját részed {formatMoney(mySharePrice)}
            </Text>
          </>
        ) : null}
        <Text className="mt-2 text-xs font-extrabold text-neutral-400">
          {isOpen ? 'Bezár' : 'Részletek'}
        </Text>
      </View>
    </Pressable>
  );
}

function TrialBadge() {
  return (
    <View className="ml-2 rounded-full bg-orange-100 px-2 py-1">
      <Text className="text-[10px] font-extrabold uppercase text-orange-600">Próbaidőszak</Text>
    </View>
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

function getSharedParticipantCount(item) {
  const explicitCount = Number(
    item.accepted_participant_count ??
      item.participant_count ??
      item.shared_participant_count
  );

  if (!Number.isNaN(explicitCount) && explicitCount > 0) {
    return explicitCount;
  }

  if (Array.isArray(item.participants) && item.participants.length > 0) {
    return item.participants.filter(
      (participant) => participant.status === 'accepted' || participant.is_owner
    ).length;
  }

  return item.is_shared ? 2 : 1;
}

function getSharedSharePrice(item) {
  const sharePrice = Number(item.my_share_price_huf ?? item.share_price_huf);

  if (!Number.isNaN(sharePrice) && sharePrice >= 0) {
    return sharePrice;
  }

  if (item.is_shared) {
    return getPriceInHuf(item) / Math.max(getSharedParticipantCount(item), 1);
  }

  return getPriceInHuf(item);
}

function getAnnualPriceInHuf(item) {
  const price = getPriceInHuf(item);

  if (item.billing_cycle === 'monthly') {
    return price * 12;
  }

  if (item.billing_cycle === 'weekly') {
    return price * 52;
  }

  return price;
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

  return categories[value] || value || 'Egyéb';
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
    return getNextDateByCycle(billingDate, today, 'month');
  }

  if (item.billing_cycle === 'yearly') {
    return getNextDateByCycle(billingDate, today, 'year');
  }

  if (item.billing_cycle === 'weekly') {
    return getNextWeeklyBillingDate(billingDate, today);
  }

  const date = startOfDay(billingDate);

  return date >= today ? date : null;
}

function getNextDateByCycle(sourceDate, today, cycle) {
  const source = startOfDay(sourceDate);
  let candidate = source;

  if (candidate <= today) {
    do {
      candidate = cycle === 'year'
        ? createDateWithClampedDay(
          candidate.getFullYear() + 1,
          candidate.getMonth(),
          source.getDate()
        )
        : createDateWithClampedDay(
          candidate.getFullYear(),
          candidate.getMonth() + 1,
          source.getDate()
        );
    } while (candidate <= today);
  }

  return candidate;
}

function getNextWeeklyBillingDate(sourceDate, today) {
  let candidate = startOfDay(sourceDate);

  while (candidate <= today) {
    candidate = new Date(
      candidate.getFullYear(),
      candidate.getMonth(),
      candidate.getDate() + 7
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
