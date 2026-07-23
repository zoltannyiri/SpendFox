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
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import BottomNavigation from '../../components/layout/BottomNavigation';
import AnimatedScreen from '../../components/layout/AnimatedScreen';

const storage = new MMKV();

const CATEGORY_META = {
  streaming: { label: 'Streaming', color: '#0ca9f2' },
  work: { label: 'Munka', color: '#111111' },
  'ai-tool': { label: 'AI tool', color: '#7c3aed' },
  hosting: { label: 'Tárhely', color: '#f97316' },
  mobile: { label: 'Mobil', color: '#10b981' },
  bank: { label: 'Bank', color: '#64748b' },
  gaming: { label: 'Játék', color: '#ef4444' },
  other: { label: 'Egyéb', color: '#f59e0b' },
};

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
  const nextAction = useMemo(() => getNextAction(subscriptions), [subscriptions]);
  const upcomingPayments = useMemo(() => getUpcomingPayments(subscriptions), [subscriptions]);
  const upcomingTrials = useMemo(() => getUpcomingTrials(subscriptions), [subscriptions]);
  const expensiveSubscriptions = useMemo(() => getMostExpensiveSubscriptions(subscriptions), [subscriptions]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(subscriptions), [subscriptions]);

  return (
    <View className="flex-1 bg-[#f3f5f8]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-36"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="SpendFox"
          subtitle="Előfizetések, tisztán és átláthatóan"
          right={
            <HeaderIconButton onPress={() => navigation.navigate('ProfileSettingsScreen')}>
              <SettingsIcon />
            </HeaderIconButton>
          }
        />

        <AnimatedScreen className="-mt-16 px-5">
          <View
            className="rounded-[30px] bg-white px-5 py-5"
            style={cardShadow}
          >
            <View className="flex-row items-center">
              {profileAvatar ? (
                <Image
                  source={{ uri: profileAvatar }}
                  className="h-20 w-20 rounded-3xl bg-fox-cream"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-3xl bg-fox-cream">
                  <Text className="text-3xl font-extrabold text-[#19386e]">
                    {getInitial(profileName)}
                  </Text>
                </View>
              )}

              <View className="ml-4 flex-1">
                <Text className="text-xs font-extrabold uppercase text-neutral-400">
                  Üdv újra
                </Text>
                <Text className="mt-1 text-2xl font-extrabold text-black" numberOfLines={1}>
                  {profileName || 'SpendFox user'}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-neutral-500">
                  {summary.activeCount} aktív előfizetésed van.
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-[30px] bg-[#0ca9f2] px-5 py-5" style={blueShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-bold text-white/80">Havi kiadás</Text>
                <Text className="mt-1 text-4xl font-extrabold text-white">
                  {formatMoney(summary.monthlyTotal)}
                </Text>
                <Text className="mt-2 text-xs font-semibold text-white/70">
                  Aktív előfizetések becsült havi összege.
                </Text>
              </View>
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <WalletIcon />
              </View>
            </View>

            <View className="mt-5 flex-row">
              <SummaryPill label="Éves becslés" value={formatMoney(summary.yearlyTotal)} />
              <View className="w-3" />
              <SummaryPill
                label={nextAction?.type === 'trial' ? 'Trial vége' : 'Következő'}
                value={nextAction ? formatDateOnly(nextAction.date) : '-'}
              />
            </View>
          </View>

          <DashboardCategoryBreakdown
            categories={summary.categoryTotals}
            total={summary.monthlyTotal}
          />

          

          <View className="mt-5 flex-row flex-wrap justify-between">
            <MetricCard
              icon={<SubscriptionsIcon />}
              label="Összes"
              value={String(subscriptions.length)}
              note={`${summary.inactiveCount} inaktív`}
            />
            <MetricCard
              icon={<CalendarIcon />}
              label={nextAction?.type === 'trial' ? 'Trial lemondás' : 'Következő fizetés'}
              value={nextAction?.name || '-'}
              note={nextAction ? `${nextAction.label} · ${formatDateOnly(nextAction.date)}` : 'Nincs dátum'}
            />
          </View>

          <DashboardListSection
            title="Lejáró próbaidők"
            subtitle="Ezeket érdemes lemondás előtt átnézni"
            emptyText="Nincs közelgő próbaidő lejárat"
            items={upcomingTrials}
            renderItem={(item, index, list) => (
              <DashboardListRow
                key={`${item.id}-trial`}
                title={item.name}
                meta={`Próbaidő vége: ${formatDateOnly(item.date)}`}
                value="Lemondás?"
                isLast={index === list.length - 1}
                tone="warning"
                onActionPress={() =>
                  navigation.navigate('SubscriptionsForm', {
                    subscription: item,
                  })
                }
              />
            )}
          />

          <DashboardListSection
            title="Közelgő fizetések"
            subtitle="A következő napokban esedékes előfizetések"
            emptyText="Nincs közelgő fizetés"
            items={upcomingPayments}
            renderItem={(item, index, list) => (
              <DashboardListRow
                key={`${item.id}-upcoming`}
                title={item.name}
                meta={formatDateOnly(item.date)}
                value={formatMoney(getPriceInHuf(item))}
                isLast={index === list.length - 1}
              />
            )}
          />

          <DashboardListSection
            title="Legdrágább előfizetések"
            subtitle="Havi költség alapján rendezve"
            emptyText="Még nincs aktív előfizetés"
            items={expensiveSubscriptions}
            renderItem={(item, index, list) => (
              <DashboardListRow
                key={`${item.id}-expensive`}
                title={item.name || 'Előfizetés'}
                meta={getCategoryLabel(item.category)}
                value={formatMoney(getMonthlyEquivalentInHuf(item))}
                isLast={index === list.length - 1}
              />
            )}
          />

          <MonthlyTrendCard data={monthlyTrend} />

          

          <View className="mt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-black">Gyors műveletek</Text>
              {loading ? <ActivityIndicator color="#0ca9f2" size="small" /> : null}
            </View>

            <View className="overflow-hidden rounded-[28px] bg-white" style={cardShadow}>
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

const blueShadow = {
  shadowColor: '#0ca9f2',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.2,
  shadowRadius: 20,
  elevation: 5,
};

const listRowSpacing = {
  marginBottom: 12,
};

function getSubscriptionSummary(items) {
  return items.reduce(
    (summary, item) => {
      const price = getPriceInHuf(item);
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
      const categoryCode = item.category || 'other';
      const categoryTotal = summary.categoryTotals[categoryCode] || 0;

      return {
        activeCount: summary.activeCount + 1,
        inactiveCount: summary.inactiveCount,
        monthlyTotal: summary.monthlyTotal + monthlyPrice,
        yearlyTotal: summary.yearlyTotal + monthlyPrice * 12,
        categoryTotals: {
          ...summary.categoryTotals,
          [categoryCode]: categoryTotal + monthlyPrice,
        },
      };
    },
    {
      activeCount: 0,
      inactiveCount: 0,
      monthlyTotal: 0,
      yearlyTotal: 0,
      categoryTotals: {},
    }
  );
}

function getNextAction(items) {
  const today = startOfDay(new Date());

  return getUpcomingEvents(items, today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
}

function getUpcomingPayments(items) {
  const today = startOfDay(new Date());

  return items
    .filter((item) => item.is_active !== false)
    .filter((item) => !getTrialEndDate(item, today))
    .map((item) => ({
      ...item,
      date: getNextBillingDate(item, today),
    }))
    .filter((item) => item.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);
}

function getUpcomingTrials(items) {
  const today = startOfDay(new Date());

  return items
    .filter((item) => item.is_active !== false)
    .map((item) => ({
      ...item,
      date: getTrialEndDate(item, today),
    }))
    .filter((item) => item.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);
}

function getUpcomingEvents(items, today) {
  const trialEvents = getUpcomingTrials(items).map((item) => ({
    id: item.id,
    name: item.name || 'Előfizetés',
    date: item.date,
    type: 'trial',
    label: 'Próbaidő vége',
  }));
  const billingEvents = getUpcomingPayments(items).map((item) => ({
    id: item.id,
    name: item.name || 'Előfizetés',
    date: item.date,
    type: 'billing',
    label: 'Fizetés',
  }));

  return [...trialEvents, ...billingEvents].filter((item) => item.date && item.date >= today);
}

function getMostExpensiveSubscriptions(items) {
  return items
    .filter((item) => item.is_active !== false)
    .sort((a, b) => getMonthlyEquivalentInHuf(b) - getMonthlyEquivalentInHuf(a))
    .slice(0, 4);
}

function getMonthlyTrend(items) {
  const now = startOfDay(new Date());
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: formatMonthLabel(date),
      total: 0,
      date,
    };
  });
  const monthByKey = Object.fromEntries(months.map((month) => [month.key, month]));
  const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 1);

  items
    .filter((item) => item.is_active !== false)
    .forEach((item) => {
      let paymentDate = getNextBillingDate(item, now);

      while (paymentDate && paymentDate < endDate) {
        const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

        if (monthByKey[key]) {
          monthByKey[key].total += getPriceInHuf(item);
        }

        paymentDate = addBillingCycle(paymentDate, item.billing_cycle);
      }
    });

  return months;
}

function getTrialEndDate(item, today) {
  if (!item.trial_enabled || !item.trial_end_date) {
    return null;
  }

  const parsedTrialEndDate = parseDateValue(item.trial_end_date);

  if (!parsedTrialEndDate) {
    return null;
  }

  const trialEndDate = startOfDay(parsedTrialEndDate);

  if (trialEndDate < today) {
    return null;
  }

  return trialEndDate;
}

function getNextBillingDate(item, today) {
  const sourceDate = parseDateValue(item.next_billing_date || item.start_date);

  if (!sourceDate) {
    return null;
  }

  const paymentDate = startOfDay(sourceDate);

  if (item.billing_cycle === 'monthly') {
    const paymentDay = paymentDate.getDate();
    let candidate = createDateWithClampedDay(
      today.getFullYear(),
      today.getMonth(),
      paymentDay
    );

    if (candidate < today) {
      candidate = createDateWithClampedDay(
        today.getFullYear(),
        today.getMonth() + 1,
        paymentDay
      );
    }

    return candidate;
  }

  if (item.billing_cycle === 'yearly') {
    let candidate = createDateWithClampedDay(
      today.getFullYear(),
      paymentDate.getMonth(),
      paymentDate.getDate()
    );

    if (candidate < today) {
      candidate = createDateWithClampedDay(
        today.getFullYear() + 1,
        paymentDate.getMonth(),
        paymentDate.getDate()
      );
    }

    return candidate;
  }

  if (item.billing_cycle === 'weekly') {
    let candidate = paymentDate;

    while (candidate < today) {
      candidate = addBillingCycle(candidate, 'weekly');
    }

    return candidate;
  }

  return paymentDate >= today ? paymentDate : null;
}

function addBillingCycle(date, billingCycle) {
  if (billingCycle === 'weekly') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  }

  if (billingCycle === 'yearly') {
    return createDateWithClampedDay(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }

  return createDateWithClampedDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function createDateWithClampedDay(year, month, day) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return new Date(year, month, Math.min(day, lastDayOfMonth));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('hu-HU', {
    month: 'short',
  });
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

function DashboardCategoryBreakdown({ categories, total }) {
  const rows = Object.entries(categories || {})
    .map(([code, value]) => ({
      code,
      value,
      meta: CATEGORY_META[code] || {
        label: code,
        color: '#64748b',
      },
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View className="mt-5 rounded-[30px] bg-white p-5" style={cardShadow}>
      <View className="mb-5 flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-lg font-extrabold text-black">Kategóriák</Text>
          <Text className="mt-1 text-xs font-semibold text-neutral-500">
            Becsült havi költés kategóriánként
          </Text>
        </View>
        <Text className="text-sm font-extrabold text-[#0ca9f2]">
          {formatMoney(total)}
        </Text>
      </View>

      {rows.map((item) => {
        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

        return (
          <View key={item.code} className="mb-4 last:mb-0">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.meta.color }}
                />
                <Text className="text-sm font-extrabold text-black">{item.meta.label}</Text>
              </View>
              <Text className="text-xs font-bold text-neutral-500">
                {formatMoney(item.value)} · {percentage}%
              </Text>
            </View>
            <View className="h-3 overflow-hidden rounded-full bg-neutral-100">
              <View
                className="h-3 rounded-full"
                style={{
                  width: `${Math.max(percentage, 4)}%`,
                  backgroundColor: item.meta.color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DashboardListSection({ title, subtitle, emptyText, items, renderItem }) {
  return (
    <View className="mt-5 rounded-[30px] bg-white p-5" style={cardShadow}>
      <View className="mb-4">
        <Text className="text-lg font-extrabold text-black">{title}</Text>
        <Text className="mt-1 text-xs font-semibold text-neutral-500">{subtitle}</Text>
      </View>

      {items.length === 0 ? (
        <View className="rounded-2xl bg-[#f3f5f8] px-4 py-4">
          <Text className="text-sm font-bold text-neutral-500">{emptyText}</Text>
        </View>
      ) : (
        items.map((item, index) => renderItem(item, index, items))
      )}
    </View>
  );
}

function DashboardListRow({ title, meta, value, isLast, tone = 'default', onActionPress }) {
  const isWarning = tone === 'warning';
  const valueClassName = `ml-3 text-sm font-extrabold ${
    isWarning ? 'text-orange-600' : 'text-black'
  }`;
  const actionTextClassName = `text-sm font-extrabold ${
    isWarning ? 'text-orange-600' : 'text-black'
  }`;

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 py-3 ${
        isWarning ? 'bg-orange-50' : 'bg-[#f3f5f8]'
      }`}
      style={!isLast ? listRowSpacing : null}
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">
        <SubscriptionsIcon />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-extrabold text-black" numberOfLines={1}>
          {title || 'Előfizetés'}
        </Text>
        <Text className="mt-1 text-xs font-semibold text-neutral-500" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {onActionPress ? (
        <Pressable
          className="ml-3 rounded-full bg-white px-3 py-2"
          onPress={onActionPress}
        >
          <Text className={actionTextClassName}>{value}</Text>
        </Pressable>
      ) : (
        <Text className={valueClassName}>{value}</Text>
      )}
    </View>
  );
}

function MonthlyTrendCard({ data }) {
  // const maxTotal = Math.max(...data.map((item) => item.total), 1);

  // return (
  //   <View className="mt-5 rounded-[30px] bg-white p-5" style={cardShadow}>
  //     <View className="mb-5 flex-row items-start justify-between">
  //       <View className="flex-1 pr-4">
  //         <Text className="text-lg font-extrabold text-black">Havi trend</Text>
  //         <Text className="mt-1 text-xs font-semibold text-neutral-500">
  //           Következő 6 hónap várható fizetései
  //         </Text>
  //       </View>
  //     </View>

  //     <View className="h-36 flex-row items-end justify-between">
  //       {data.map((item) => {
  //         const height = Math.max((item.total / maxTotal) * 112, item.total > 0 ? 16 : 6);

  //         return (
  //           <View key={item.key} className="items-center">
  //             <View className="h-28 justify-end">
  //               <View
  //                 className="w-8 rounded-t-2xl bg-[#0ca9f2]"
  //                 style={{ height }}
  //               />
  //             </View>
  //             <Text className="mt-2 text-[10px] font-bold text-neutral-500">
  //               {item.label}
  //             </Text>
  //           </View>
  //         );
  //       })}
  //     </View>
  //   </View>
  // );
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

function getMonthlyEquivalentInHuf(item) {
  const price = getPriceInHuf(item);

  if (item.billing_cycle === 'yearly') {
    return price / 12;
  }

  if (item.billing_cycle === 'weekly') {
    return price * 4;
  }

  return price;
}

function getCategoryLabel(value) {
  return CATEGORY_META[value]?.label || value || 'Egyéb';
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
    <View className="mb-3 min-h-[128px] w-[48%] justify-between rounded-3xl bg-white p-4" style={cardShadow}>
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
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#eef7ff]">
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
      <Path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" stroke="#fff" strokeLinejoin="round" strokeWidth="1.8" />
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
      <Circle cx="12" cy="12" r="8" stroke="#19386e" strokeWidth="1.8" />
      <Path d="M12 8v8M8 12h8" stroke="#19386e" strokeLinecap="round" strokeWidth="1.8" />
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
