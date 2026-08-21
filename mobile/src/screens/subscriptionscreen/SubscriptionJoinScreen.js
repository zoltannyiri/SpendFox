import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import BottomNavigation from '../../components/layout/BottomNavigation';
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import AnimatedScreen from '../../components/layout/AnimatedScreen';

const COLORS = {
  blue: '#0ca9f2',
  navy: '#19386e',
};
const storage = new MMKV();

export default function SubscriptionJoinScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const token = route.params?.token;
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadPreview = useCallback(async () => {
    if (!token) {
      setErrorText('Hiányzó meghívó token.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorText('');
      const response = await axios.get(`/subscriptions/share-links/${token}`);
      setPreview(response.data?.data || null);
    } catch (err) {
      console.log('Failed to load share link:', err?.response?.data || err?.message);
      if (err?.response?.status === 401 && token) {
        storage.set('pendingShareToken', String(token));
        setErrorText('A meghívó megnyitásához előbb jelentkezz be.');
        return;
      }
      setErrorText(err?.response?.data?.error || 'Nem sikerült betölteni a meghívót.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const joinShare = async () => {
    if (!token || joining) {
      return;
    }

    try {
      setJoining(true);
      setErrorText('');
      const response = await axios.post(`/subscriptions/share-links/${token}/join`);
      const subscription = response.data?.data?.subscription;
      const role = response.data?.data?.role;

      navigation.replace('SubscriptionShare', {
        subscription,
        subscriptionId: subscription?.id || preview?.subscription?.id,
        role,
      });
    } catch (err) {
      console.log('Failed to join share link:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerült csatlakozni.');
    } finally {
      setJoining(false);
    }
  };

  const subscription = preview?.subscription;
  const owner = preview?.owner;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f3f5f8]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="Meghívó"
          subtitle="Közös előfizetés csatlakozás"
          left={
            <HeaderIconButton onPress={() => navigation.goBack()} dark>
              <BackIcon />
            </HeaderIconButton>
          }
          compact
        />

        <AnimatedScreen className="-mt-10 px-5">
          <View className="rounded-[32px] bg-white p-5" style={cardShadow}>
            {loading ? (
              <View className="items-center py-12">
                <ActivityIndicator color={COLORS.blue} />
                <Text className="mt-4 text-sm font-extrabold text-neutral-500">
                  Meghívó betöltése...
                </Text>
              </View>
            ) : errorText ? (
              <>
                <Text className="text-lg font-extrabold text-red-600">{errorText}</Text>
                {errorText.includes('jelentkezz be') ? (
                  <Pressable
                    className="mt-5 rounded-2xl bg-[#0ca9f2] py-4"
                    onPress={() => navigation.navigate('LoginScreen')}
                  >
                    <Text className="text-center text-sm font-extrabold text-white">
                      Bejelentkezés
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable className="mt-5 rounded-2xl bg-black py-4" onPress={loadPreview}>
                  <Text className="text-center text-sm font-extrabold text-white">Újrapróbálom</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-xs font-extrabold uppercase tracking-[2px] text-[#0ca9f2]">
                  SpendFox meghívó
                </Text>
                <Text className="mt-2 text-3xl font-extrabold text-black">
                  {subscription?.name || 'Közös előfizetés'}
                </Text>
                <Text className="mt-2 text-sm font-semibold leading-5 text-neutral-500">
                  {getOwnerName(owner)} meghívott, hogy közösen kezeljétek ezt az előfizetést.
                </Text>

                <View className="mt-5 flex-row">
                  <SummaryBox label="Havi összeg" value={formatMoney(subscription?.price_huf)} />
                  <View className="w-3" />
                  <SummaryBox label="Ciklus" value={getBillingCycleLabel(subscription?.billing_cycle)} />
                </View>

                {preview?.already_joined ? (
                  <Text className="mt-5 rounded-2xl bg-green-50 px-4 py-4 text-sm font-extrabold text-green-700">
                    Már csatlakoztál ehhez a közös előfizetéshez.
                  </Text>
                ) : null}

                <Pressable
                  className={`mt-6 rounded-2xl py-4 ${joining ? 'bg-neutral-300' : 'bg-[#0ca9f2]'}`}
                  disabled={joining}
                  onPress={joinShare}
                >
                  {joining ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-center text-sm font-extrabold text-white">
                      Csatlakozás
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </AnimatedScreen>
      </ScrollView>

      <BottomNavigation />
    </KeyboardAvoidingView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 4,
};

function SummaryBox({ label, value }) {
  return (
    <View className="flex-1 rounded-2xl bg-[#eef7ff] px-4 py-4">
      <Text className="text-xs font-bold text-neutral-500">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-black">{value}</Text>
    </View>
  );
}

function getOwnerName(owner) {
  return owner?.full_name || owner?.username || owner?.email || 'Egy ismerősöd';
}

function getBillingCycleLabel(value) {
  if (value === 'monthly') {
    return 'Havi';
  }

  if (value === 'yearly') {
    return 'Éves';
  }

  if (value === 'weekly') {
    return 'Heti';
  }

  return 'Ciklus';
}

function formatMoney(value) {
  const amount = Number(value) || 0;

  return `${Math.round(amount).toLocaleString('hu-HU')} Ft`;
}

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5 8 12l7 7"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
