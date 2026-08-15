import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import BottomNavigation from '../../components/layout/BottomNavigation';
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import AnimatedScreen from '../../components/layout/AnimatedScreen';

const storage = new MMKV();
const COLORS = {
  blue: '#0ca9f2',
  navy: '#19386e',
};

export default function SubscriptionShareScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialSubscription = route.params?.subscription;
  const subscriptionId = route.params?.subscriptionId || initialSubscription?.id;
  const profileId = getStoredUser()?.id;
  const [subscription, setSubscription] = useState(initialSubscription || null);
  const [role, setRole] = useState(route.params?.role || null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const participants = useMemo(() => subscription?.participants || [], [subscription]);
  const acceptedParticipants = participants.filter(
    (participant) => participant.status === 'accepted' || participant.is_owner
  );
  const settledCount = participants.filter(
    (participant) => participant.settlement_status === 'settled'
  ).length;

  const loadOverview = useCallback(async () => {
    if (!subscriptionId) {
      setErrorText('Hiányzó előfizetés azonosító.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorText('');
      const response = await axios.get(`/subscriptions/${subscriptionId}/share/overview`);
      setSubscription(response.data?.data?.subscription || null);
      setRole(response.data?.data?.role || null);
    } catch (err) {
      console.log('Failed to load shared subscription:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerült betölteni a közös előfizetést.');
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  const loadMessages = useCallback(async () => {
    if (!subscriptionId) {
      return;
    }

    try {
      setMessagesLoading(true);
      const response = await axios.get(`/subscriptions/${subscriptionId}/share/messages`);
      setMessages(response.data?.data || []);
    } catch (err) {
      console.log('Failed to load shared messages:', err?.response?.data || err?.message);
    } finally {
      setMessagesLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    loadOverview();
    loadMessages();
  }, [loadOverview, loadMessages]);

  const updateSettlement = async (participantUserId, settlementStatus) => {
    try {
      setSaving(true);
      await axios.patch(
        `/subscriptions/${subscriptionId}/share/participants/${participantUserId}`,
        { settlement_status: settlementStatus }
      );
      await loadOverview();
    } catch (err) {
      console.log('Failed to update settlement:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerült frissíteni a státuszt.');
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    const cleanBody = messageBody.trim();

    if (!cleanBody || saving) {
      return;
    }

    try {
      setSaving(true);
      await axios.post(`/subscriptions/${subscriptionId}/share/messages`, { body: cleanBody });
      setMessageBody('');
      await loadMessages();
    } catch (err) {
      console.log('Failed to send shared message:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerült elküldeni az üzenetet.');
    } finally {
      setSaving(false);
    }
  };

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
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title="Közös előfizetés"
          subtitle="Részek, státusz és beszélgetés"
          left={
            <HeaderIconButton onPress={() => navigation.goBack()} dark>
              <BackIcon />
            </HeaderIconButton>
          }
          compact
        />

        <AnimatedScreen className="-mt-10 px-5">
          {loading ? (
            <View className="items-center rounded-[30px] bg-white px-5 py-12" style={cardShadow}>
              <ActivityIndicator color={COLORS.blue} />
              <Text className="mt-4 text-sm font-extrabold text-neutral-500">Betöltés...</Text>
            </View>
          ) : errorText ? (
            <View className="rounded-[30px] bg-white px-5 py-8" style={cardShadow}>
              <Text className="text-base font-extrabold text-red-600">{errorText}</Text>
              <Pressable className="mt-5 rounded-2xl bg-black py-4" onPress={loadOverview}>
                <Text className="text-center text-sm font-extrabold text-white">Újrapróbálom</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="rounded-[30px] bg-white p-5" style={cardShadow}>
                <Text className="text-xs font-extrabold uppercase tracking-[2px] text-[#0ca9f2]">
                  Megosztott előfizetés
                </Text>
                <Text className="mt-2 text-3xl font-extrabold text-black">
                  {subscription?.name || 'Előfizetés'}
                </Text>
                <Text className="mt-2 text-sm font-semibold text-neutral-500">
                  {acceptedParticipants.length} résztvevő · saját részed {formatMoney(subscription?.my_share_price_huf)}
                </Text>

                <View className="mt-5 flex-row">
                  <SummaryBox label="Teljes összeg" value={formatMoney(subscription?.price_huf)} />
                  <View className="w-3" />
                  <SummaryBox label="Rendezve" value={`${settledCount}/${participants.length}`} />
                </View>
              </View>

              <View className="mt-6 rounded-[30px] bg-white p-5" style={cardShadow}>
                <Text className="text-lg font-extrabold text-black">Résztvevők</Text>
                <Text className="mt-1 text-sm font-semibold text-neutral-500">
                  Itt látszik, ki mennyivel száll be. Fizetés nem történik az appon belül.
                </Text>

                <View className="mt-4">
                  {participants.map((participant) => {
                    const isMine = String(participant.user_id) === String(profileId);
                    const canUpdate = !participant.is_owner && (role === 'owner' || isMine);
                    const settled = participant.settlement_status === 'settled';

                    return (
                      <View
                        key={`${participant.user_id}-${participant.status}`}
                        className="mb-3 rounded-2xl bg-[#f7f8fa] px-4 py-4"
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-4">
                            <Text className="text-sm font-extrabold text-black">
                              {getParticipantName(participant)}
                            </Text>
                            <Text className="mt-1 text-xs font-bold text-neutral-500">
                              {participant.is_owner ? 'Tulajdonos' : getParticipantStatus(participant.status)}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text className="text-sm font-extrabold text-black">
                              {formatMoney(participant.share_price_huf)}
                            </Text>
                            <Text
                              className={`mt-1 text-xs font-extrabold ${
                                settled ? 'text-green-600' : 'text-orange-500'
                              }`}
                            >
                              {settled ? 'Rendezve' : 'Függőben'}
                            </Text>
                          </View>
                        </View>

                        {canUpdate ? (
                          <View className="mt-3 flex-row">
                            <Pressable
                              className={`mr-2 flex-1 rounded-xl py-3 ${
                                !settled ? 'bg-black' : 'bg-white'
                              }`}
                              disabled={saving}
                              onPress={() => updateSettlement(participant.user_id, 'pending')}
                            >
                              <Text
                                className={`text-center text-xs font-extrabold ${
                                  !settled ? 'text-white' : 'text-black'
                                }`}
                              >
                                Függőben
                              </Text>
                            </Pressable>
                            <Pressable
                              className={`flex-1 rounded-xl py-3 ${
                                settled ? 'bg-green-500' : 'bg-white'
                              }`}
                              disabled={saving}
                              onPress={() => updateSettlement(participant.user_id, 'settled')}
                            >
                              <Text
                                className={`text-center text-xs font-extrabold ${
                                  settled ? 'text-white' : 'text-black'
                                }`}
                              >
                                Rendezve
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6 rounded-[30px] bg-white p-5" style={cardShadow}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-extrabold text-black">Közös chat</Text>
                  {messagesLoading ? <ActivityIndicator color={COLORS.blue} size="small" /> : null}
                </View>

                <View className="mt-4">
                  {messages.length === 0 ? (
                    <Text className="rounded-2xl bg-[#f7f8fa] px-4 py-4 text-sm font-semibold text-neutral-500">
                      Még nincs üzenet. Írj egy rövid egyeztetést a közös előfizetéshez.
                    </Text>
                  ) : (
                    messages.map((message) => {
                      const isMine = String(message.sender_id) === String(profileId);

                      return (
                        <View
                          key={String(message.id)}
                          className={`mb-3 max-w-[86%] rounded-2xl px-4 py-3 ${
                            isMine ? 'self-end bg-[#0ca9f2]' : 'self-start bg-[#f7f8fa]'
                          }`}
                        >
                          <Text
                            className={`text-xs font-extrabold ${
                              isMine ? 'text-white/80' : 'text-neutral-500'
                            }`}
                          >
                            {getUserName(message.sender)} · {formatTime(message.created_at)}
                          </Text>
                          <Text
                            className={`mt-1 text-sm font-semibold leading-5 ${
                              isMine ? 'text-white' : 'text-black'
                            }`}
                          >
                            {message.body}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                <View className="mt-4 flex-row items-end rounded-2xl bg-[#f7f8fa] p-2">
                  <TextInput
                    className="max-h-28 flex-1 px-3 py-2 text-sm font-semibold text-black"
                    placeholder="Írj üzenetet..."
                    placeholderTextColor="#9b9ba1"
                    multiline
                    value={messageBody}
                    onChangeText={setMessageBody}
                  />
                  <Pressable
                    className={`rounded-xl px-4 py-3 ${
                      messageBody.trim() ? 'bg-black' : 'bg-neutral-300'
                    }`}
                    disabled={!messageBody.trim() || saving}
                    onPress={sendMessage}
                  >
                    <Text className="text-xs font-extrabold text-white">Küldés</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
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
      <Text className="mt-1 text-lg font-extrabold text-black">{value}</Text>
    </View>
  );
}

function getStoredUser() {
  try {
    const storedUser = storage.getString('appUser');

    return storedUser ? JSON.parse(storedUser) : null;
  } catch (err) {
    console.log('Failed to parse stored user:', err?.message);
    return null;
  }
}

function getParticipantName(participant) {
  return (
    participant?.user?.full_name ||
    participant?.full_name ||
    participant?.user?.username ||
    participant?.username ||
    participant?.user?.email ||
    participant?.email ||
    'Résztvevő'
  );
}

function getUserName(user) {
  return user?.full_name || user?.username || user?.email || 'Felhasználó';
}

function getParticipantStatus(status) {
  if (status === 'accepted') {
    return 'Elfogadva';
  }

  if (status === 'pending') {
    return 'Meghívva';
  }

  return 'Résztvevő';
}

function formatMoney(value) {
  const amount = Number(value) || 0;

  return `${Math.round(amount).toLocaleString('hu-HU')} Ft`;
}

function formatTime(value) {
  const date = parseTimestamp(value);

  if (!date) {
    return '';
  }

  return date.toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  if (value._seconds) {
    return new Date(value._seconds * 1000);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
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
