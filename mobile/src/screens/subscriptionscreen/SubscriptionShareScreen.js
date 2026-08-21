import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import useKeyboardSafeScroll from '../../hooks/useKeyboardSafeScroll';

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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const {
    scrollRef,
    contentContainerStyle,
    scrollToEndAfterKeyboard,
  } = useKeyboardSafeScroll({
    defaultBottomPadding: 128,
    keyboardBottomPadding: 340,
  });

  const participants = useMemo(() => subscription?.participants || [], [subscription]);
  const acceptedParticipants = participants.filter(
    (participant) => participant.status === 'accepted' || participant.is_owner
  );
  const settledCount = acceptedParticipants.filter(
    (participant) => participant.settlement_status === 'settled'
  ).length;
  const isOwner = role === 'owner';

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

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    if (!subscriptionId) {
      return;
    }

    try {
      if (!silent) {
        setMessagesLoading(true);
      }
      const response = await axios.get(`/subscriptions/${subscriptionId}/share/messages`);
      setMessages(response.data?.data || []);
    } catch (err) {
      console.log('Failed to load shared messages:', err?.response?.data || err?.message);
    } finally {
      if (!silent) {
        setMessagesLoading(false);
      }
    }
  }, [subscriptionId]);

  useEffect(() => {
    loadOverview();
    loadMessages();
  }, [loadOverview, loadMessages]);

  useEffect(() => {
    if (!subscriptionId || loading) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadMessages({ silent: true });
    }, 4000);

    return () => clearInterval(intervalId);
  }, [loadMessages, loading, subscriptionId]);

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
      scrollToEndAfterKeyboard();
    } catch (err) {
      console.log('Failed to send shared message:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerült elküldeni az üzenetet.');
    } finally {
      setSaving(false);
    }
  };

  const loadInviteLink = async () => {
    if (!subscriptionId || inviteLoading) {
      return;
    }

    try {
      setInviteLoading(true);
      setErrorText('');
      const response = await axios.post(`/subscriptions/${subscriptionId}/share/link`);
      const token = response.data?.data?.token;

      if (!token) {
        throw new Error('Missing invite token');
      }

      const deepLink = `spendfox://subscription-share/${token}`;
      setInviteLink({
        token,
        deepLink,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=16&data=${encodeURIComponent(deepLink)}`,
      });
      setInviteModalOpen(true);
    } catch (err) {
      console.log('Failed to create invite link:', err?.response?.data || err?.message);
      setErrorText(err?.response?.data?.error || 'Nem sikerült létrehozni a meghívót.');
    } finally {
      setInviteLoading(false);
    }
  };

  const shareInviteLink = async () => {
    if (!inviteLink?.deepLink) {
      return;
    }

    await Share.share({
      message: `Csatlakozz ehhez a SpendFox közös előfizetéshez: ${inviteLink.deepLink}`,
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f3f5f8]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="pb-32"
        contentContainerStyle={contentContainerStyle}
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
          right={
            isOwner ? (
              <HeaderIconButton onPress={loadInviteLink} dark>
                {inviteLoading ? <ActivityIndicator color="#fff" size="small" /> : <QrIcon />}
              </HeaderIconButton>
            ) : null
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
              <View className="overflow-hidden rounded-[32px] bg-white" style={cardShadow}>
                <View className="bg-[#eaf7ff] px-5 pb-5 pt-5">
                  <Text className="text-xs font-extrabold uppercase tracking-[2px] text-[#0b84c6]">
                    Megosztott előfizetés
                  </Text>
                  <Text className="mt-2 text-3xl font-extrabold text-black">
                    {subscription?.name || 'Előfizetés'}
                  </Text>
                  <Text className="mt-2 text-sm font-semibold leading-5 text-[#4f6274]">
                    {acceptedParticipants.length} résztvevő kezeli együtt. Fizetés nem történik az appon belül, itt csak a részeket és státuszokat követitek.
                  </Text>
                </View>

                <View className="p-5">
                  <View className="mt-5 flex-row">
                    <SummaryBox label="Saját részed" value={formatMoney(subscription?.my_share_price_huf)} highlighted />
                    <View className="w-3" />
                    <SummaryBox label="Rendezve" value={`${settledCount}/${Math.max(acceptedParticipants.length, 1)}`} />
                  </View>

                  <View className="mt-3 flex-row">
                    <SummaryBox label="Teljes összeg" value={formatMoney(subscription?.price_huf)} />
                    <View className="w-3" />
                    <SummaryBox label="Szereped" value={isOwner ? 'Tulajdonos' : 'Résztvevő'} />
                  </View>
                </View>

                {isOwner ? (
                  <Pressable
                    className="mx-5 mb-5 rounded-2xl bg-black px-4 py-4"
                    disabled={inviteLoading}
                    onPress={loadInviteLink}
                  >
                    <Text className="text-center text-sm font-extrabold text-white">
                      QR meghívó megnyitása
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View className="mt-6 rounded-[30px] bg-white p-5" style={cardShadow}>
                <Text className="text-lg font-extrabold text-black">Résztvevők</Text>
                <Text className="mt-1 text-sm font-semibold leading-5 text-neutral-500">
                  Itt látszik, ki mennyivel száll be és ki rendezte már a részét.
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
                            className={`mt-1 shrink text-sm font-semibold leading-5 ${
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
                    onFocus={scrollToEndAfterKeyboard}
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
      <Modal
        visible={inviteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45 px-5 pb-8">
          <View className="rounded-[32px] bg-white p-5" style={cardShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-extrabold uppercase tracking-[2px] text-[#0ca9f2]">
                  QR meghívó
                </Text>
                <Text className="mt-2 text-2xl font-extrabold text-black">
                  Csatlakozás közös előfizetéshez
                </Text>
                <Text className="mt-2 text-sm font-semibold leading-5 text-neutral-500">
                  A másik fél olvassa be a QR-t, vagy küldd át neki a linket. Belépés után automatikusan csatlakozhat.
                </Text>
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f4f7]"
                onPress={() => setInviteModalOpen(false)}
              >
                <Text className="text-lg font-extrabold text-black">×</Text>
              </Pressable>
            </View>

            {inviteLink?.qrUrl ? (
              <View className="mt-5 items-center rounded-[28px] bg-[#f7f8fa] p-5">
                <Image
                  source={{ uri: inviteLink.qrUrl }}
                  className="h-[260px] w-[260px] rounded-3xl"
                  resizeMode="contain"
                />
                <Text className="mt-4 text-center text-xs font-bold text-neutral-500">
                  {inviteLink.deepLink}
                </Text>
              </View>
            ) : null}

            <Pressable className="mt-5 rounded-2xl bg-[#0ca9f2] py-4" onPress={shareInviteLink}>
              <Text className="text-center text-sm font-extrabold text-white">Link küldése</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

function SummaryBox({ label, value, highlighted = false }) {
  return (
    <View className={`flex-1 rounded-2xl px-4 py-4 ${highlighted ? 'bg-[#0ca9f2]' : 'bg-[#f3f7fb]'}`}>
      <Text className={`text-xs font-bold ${highlighted ? 'text-white/80' : 'text-[#6c7a89]'}`}>
        {label}
      </Text>
      <Text
        className={`mt-1 text-lg font-extrabold ${highlighted ? 'text-white' : 'text-black'}`}
        numberOfLines={1}
      >
        {value}
      </Text>
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

function QrIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <Path d="M14 14h2v2h-2v-2Zm4 0h2v6h-6v-2h4v-4Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
