import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import axios from 'axios';

const COLORS = {
  bg: '#f7f7f8',
  black: '#111111',
  muted: '#73737a',
  blue: '#0ca9f2',
  navy: '#19386e',
  cream: '#fff7e6',
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

      const profileResponse = await axios.get('/profile');
      const userId = profileResponse.data?.data?.id;
      const subscriptionResponse = await axios.get('/subscriptions', {
        params: userId ? { userId } : undefined,
      });

      setSubscriptions(subscriptionResponse.data?.data || []);
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
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.roundButton} onPress={() => navigation.goBack()}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Elofizeteseim</Text>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Havi osszesen</Text>
              <Text style={styles.summaryAmount}>{formatMoney(totalMonthly)}</Text>
            </View>
            <View style={styles.summaryIcon}>
              <WalletIcon />
            </View>
          </View>

          <View style={styles.summaryPills}>
            <SummaryPill label="Aktiv" value={String(subscriptions.length)} />
            <View style={styles.pillGap} />
            <SummaryPill label="Kovetkezo" value={getNextBillingLabel(subscriptions)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lista</Text>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={COLORS.blue} size="large" />
              <Text style={styles.stateText}>Betoltes...</Text>
            </View>
          ) : errorText ? (
            <View style={styles.stateCard}>
              <ErrorIcon />
              <Text style={styles.errorText}>{errorText}</Text>
              <Pressable style={styles.retryButton} onPress={loadSubscriptions}>
                <Text style={styles.retryText}>Ujraprobalom</Text>
              </Pressable>
            </View>
          ) : subscriptions.length === 0 ? (
            <View style={styles.stateCard}>
              <EmptyIcon />
              <Text style={styles.emptyTitle}>Meg nincs elofizetesed</Text>
              <Text style={styles.emptyText}>
                Add hozza az elso szolgaltatast, hogy egy helyen lasd a havi kiadasaidat.
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
    <Pressable style={({ pressed }) => [styles.subscriptionCard, pressed && styles.pressed]}>
      <View style={styles.subscriptionIcon}>
        <SubscriptionIcon />
      </View>

      <View style={styles.subscriptionBody}>
        <Text style={styles.subscriptionName}>{name}</Text>
        <Text style={styles.subscriptionMeta}>
          {billingCycle}
          {nextBilling}
        </Text>
      </View>

      <View style={styles.subscriptionPriceWrap}>
        <Text style={styles.subscriptionPrice}>
          {formatMoney(subscription.price, currency)}
        </Text>
        {subscription.is_shared ? (
          <Text style={styles.sharedText}>Megosztott</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SummaryPill({ label, value }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
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
      <Circle cx="40" cy="40" r="40" fill={COLORS.cream} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 64,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: COLORS.black,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 31,
  },
  headerTitle: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    padding: 20,
  },
  summaryTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryAmount: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  summaryPills: {
    flexDirection: 'row',
    marginTop: 20,
  },
  summaryPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillGap: {
    width: 12,
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
  },
  pillValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  centerState: {
    alignItems: 'center',
    marginTop: 64,
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  errorText: {
    color: '#404047',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.black,
    borderRadius: 999,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyTitle: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  subscriptionCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.86,
  },
  subscriptionIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  subscriptionBody: {
    flex: 1,
    marginLeft: 16,
  },
  subscriptionName: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '800',
  },
  subscriptionMeta: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  subscriptionPriceWrap: {
    alignItems: 'flex-end',
  },
  subscriptionPrice: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '800',
  },
  sharedText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
