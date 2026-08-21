import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomNavigation from '../../components/layout/BottomNavigation';
import CurvedHeader, { HeaderIconButton } from '../../components/layout/CurvedHeader';
import AnimatedScreen from '../../components/layout/AnimatedScreen';
import useKeyboardSafeScroll from '../../hooks/useKeyboardSafeScroll';

const storage = new MMKV();

const BILLING_CYCLES = [
  { label: 'Havi', value: 'monthly' },
  { label: 'Éves', value: 'yearly' },
  { label: 'Heti', value: 'weekly' },
];

export default function SubscriptionsFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const editingSubscription = route.params?.subscription || null;
  const isEditMode = Boolean(editingSubscription?.id);

  const [currencies, setCurrencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState(editingSubscription?.name || '');
  const [price, setPrice] = useState(
    editingSubscription?.price === undefined ? '' : String(editingSubscription.price)
  );
  const [currency, setCurrency] = useState(editingSubscription?.currency || 'HUF');
  const [billingCycle, setBillingCycle] = useState(
    editingSubscription?.billing_cycle || 'monthly'
  );
  const [category, setCategory] = useState(editingSubscription?.category || 'other');
  const [startDate, setStartDate] = useState(
    formatDateInput(editingSubscription?.start_date || editingSubscription?.next_billing_date || '')
  );
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [nextBillingDate, setNextBillingDate] = useState(
    formatDateInput(editingSubscription?.next_billing_date || '')
  );
  const [showNextBillingDatePicker, setShowNextBillingDatePicker] = useState(false);
  const [trialEnabled, setTrialEnabled] = useState(editingSubscription?.trial_enabled ?? false);
  const [trialEndDate, setTrialEndDate] = useState(
    formatDateInput(editingSubscription?.trial_end_date || '')
  );
  const [showTrialDatePicker, setShowTrialDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(editingSubscription?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const {
    scrollRef,
    contentContainerStyle,
    scrollToEndAfterKeyboard,
  } = useKeyboardSafeScroll({
    defaultBottomPadding: 288,
    keyboardBottomPadding: 380,
  });

  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        const [currencyResponse, categoryResponse] = await Promise.all([
          axios.get('/dictionary/currency'),
          axios.get('/dictionary/subscription-category'),
        ]);
        const currencyItems = currencyResponse.data?.data || [];
        const categoryItems = categoryResponse.data?.data || [];

        setCurrencies(currencyItems);
        setCategories(categoryItems);
        setCurrency((currentCurrency) => currentCurrency || currencyItems[0]?.code || 'HUF');
        setCategory((currentCategory) => currentCategory || categoryItems[0]?.code || 'other');
      } catch (err) {
        console.log('Failed to load dictionaries:', err?.response?.data || err?.message);
      }
    };

    loadDictionaries();
  }, []);

  const handleDeleteSubscription = () => {
    Alert.alert(
      'Előfizetés törlése',
      'Biztosan törölni szeretnéd ezt az előfizetést?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: deleteSubscription,
        },
      ]
    );
  };

  const deleteSubscription = async () => {
    try {
      setSaving(true);
      await axios.delete(`/subscriptions/${editingSubscription.id}`);
      navigation.goBack();
    } catch (err) {
      console.log('Failed to delete subscription:', err?.response?.data || err?.message);
      setErrorText('Nem sikerült törölni az előfizetést.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorText('');

      const normalizedStartDate = startDate.trim();

      if (!normalizedStartDate) {
        setErrorText('Add meg a kezdő napot.');
        return;
      }

      if (trialEnabled && !trialEndDate.trim()) {
        setErrorText('Add meg a próbaidő végét.');
        return;
      }

      const user = JSON.parse(storage.getString('appUser') || '{}');
      const payload = {
        name: name.trim(),
        price: Number(price),
        currency,
        category,
        billing_cycle: billingCycle,
        start_date: normalizedStartDate,
        next_billing_date: !trialEnabled && nextBillingDate.trim()
          ? nextBillingDate.trim()
          : undefined,
        trial_enabled: trialEnabled,
        trial_end_date: trialEnabled ? trialEndDate.trim() || null : null,
        is_shared: editingSubscription?.is_shared || false,
        is_active: isActive,
        user_id: user.id,
      };

      if (isEditMode) {
        await axios.patch(`/subscriptions/${editingSubscription.id}`, payload);
      } else {
        await axios.post('/subscriptions', payload);
      }

      navigation.goBack();
    } catch (err) {
      console.log('Failed to save subscription:', err?.response?.data || err?.message);
      setErrorText('Nem sikerült menteni az előfizetést.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f3f5f8]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#19386e" />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="pb-72"
        contentContainerStyle={contentContainerStyle}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CurvedHeader
          title={isEditMode ? 'Előfizetés szerkesztése' : 'Új előfizetés'}
          subtitle="Szolgáltatás, ár és számlázási ciklus"
          left={
            <HeaderIconButton onPress={() => navigation.goBack()}>
              <BackIcon />
            </HeaderIconButton>
          }
          compact
        />

        <AnimatedScreen className="-mt-10 px-5">
          <View className="rounded-[30px] bg-[#0ca9f2] px-5 py-5" style={blueShadow}>
            <Text className="text-sm font-bold text-white/80">SpendFox</Text>
            <Text className="mt-1 text-3xl font-extrabold text-white">
              Kövess minden havi költséget
            </Text>
            <Text className="mt-3 text-sm font-semibold leading-5 text-white/80">
              Add hozzá a szolgáltatást, árat, ciklust és kezdő napot.
            </Text>
          </View>

          {!!errorText && (
            <View className="mt-5 rounded-2xl bg-red-50 px-4 py-3">
              <Text className="text-sm font-bold text-red-600">{errorText}</Text>
            </View>
          )}

          <View className="mt-7 rounded-[28px] bg-white p-4" style={cardShadow}>
            <FieldLabel label="Név" />
            <TextInput
              className="h-14 rounded-2xl bg-[#f7f8fa] px-4 text-base font-semibold text-black"
              placeholder="Netflix, Spotify, YouTube..."
              placeholderTextColor="#9b9ba1"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

            <View className="mt-5 flex-row">
              <View className="mr-3 flex-1">
                <FieldLabel label="Ár" />
                <TextInput
                  className="h-14 rounded-2xl bg-[#f7f8fa] px-4 text-base font-semibold text-black"
                  placeholder="3990"
                  placeholderTextColor="#9b9ba1"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                  returnKeyType="done"
                />
              </View>

              <View className="w-28">
                <FieldLabel label="Deviza" />
                <Dropdown
                  data={currencies.map((c) => ({ label: c.code, value: c.code }))}
                  labelField="label"
                  valueField="value"
                  value={currency}
                  onChange={(item) => setCurrency(item.value)}
                  style={styles.dropdown}
                  selectedTextStyle={styles.dropdownText}
                  itemTextStyle={styles.dropdownItemText}
                  placeholderStyle={styles.dropdownText}
                />
              </View>
            </View>

            <View className="mt-5">
              <FieldLabel label="Kategória" />
              <Dropdown
                data={categories.map((item) => ({
                  label: item.name || item.code,
                  value: item.code,
                }))}
                labelField="label"
                valueField="value"
                value={category}
                onChange={(item) => setCategory(item.value)}
                style={styles.dropdown}
                selectedTextStyle={styles.dropdownText}
                itemTextStyle={styles.dropdownItemText}
                placeholder="Válassz kategóriát"
                placeholderStyle={styles.dropdownText}
              />
            </View>

            <View className="mt-5">
              <FieldLabel label="Számlázási ciklus" />
              <View className="flex-row rounded-2xl bg-[#f7f8fa] p-1">
                {BILLING_CYCLES.map((item) => {
                  const active = item.value === billingCycle;

                  return (
                    <Pressable
                      key={item.value}
                      className={`h-12 flex-1 items-center justify-center rounded-xl ${
                        active ? 'bg-[#0ca9f2]' : ''
                      }`}
                      onPress={() => setBillingCycle(item.value)}
                    >
                      <Text
                        className={`text-sm font-extrabold ${
                          active ? 'text-white' : 'text-neutral-500'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mt-5">
              <FieldLabel label="Kezdő nap" />
              <Pressable
                className="h-14 justify-center rounded-2xl bg-[#f7f8fa] px-4"
                onPress={() => {
                  setShowStartDatePicker(true);
                  scrollToEndAfterKeyboard();
                }}
              >
                <Text className="text-base font-semibold text-black">
                  {startDate || 'Válassz dátumot'}
                </Text>
              </Pressable>

              {showStartDatePicker ? (
                <View className="mt-2 overflow-hidden rounded-2xl bg-white">
                  <DateTimePicker
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    mode="date"
                    value={parseDateInput(startDate) || new Date()}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowStartDatePicker(false);
                      }

                      if (selectedDate) {
                        setStartDate(formatDateInput(selectedDate));
                      }
                    }}
                  />
                  {Platform.OS === 'ios' ? (
                    <Pressable
                      className="h-12 items-center justify-center border-t border-neutral-100"
                      onPress={() => setShowStartDatePicker(false)}
                    >
                      <Text className="text-sm font-extrabold text-[#0ca9f2]">Kész</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

            {!trialEnabled ? (
              <View className="mt-5">
                <FieldLabel label="Következő fizetés" />
                <Pressable
                  className="h-14 justify-center rounded-2xl bg-[#f7f8fa] px-4"
                  onPress={() => {
                    setShowNextBillingDatePicker(true);
                    scrollToEndAfterKeyboard();
                  }}
                >
                  <Text className="text-base font-semibold text-black">
                    {nextBillingDate || 'Automatikus számítás'}
                  </Text>
                </Pressable>
                <Text className="mt-2 text-xs font-semibold leading-4 text-neutral-500">
                  Csak akkor módosítsd, ha a tényleges fizetési dátum elcsúszott.
                </Text>
                {!!nextBillingDate && (
                  <Pressable className="mt-2 self-start" onPress={() => setNextBillingDate('')}>
                    <Text className="text-xs font-extrabold text-[#0ca9f2]">
                      Automatikusra állítás
                    </Text>
                  </Pressable>
                )}

                {showNextBillingDatePicker ? (
                  <View className="mt-2 overflow-hidden rounded-2xl bg-white">
                    <DateTimePicker
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      mode="date"
                      value={parseDateInput(nextBillingDate) || parseDateInput(startDate) || new Date()}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowNextBillingDatePicker(false);
                        }

                        if (selectedDate) {
                          setNextBillingDate(formatDateInput(selectedDate));
                        }
                      }}
                    />
                    {Platform.OS === 'ios' ? (
                      <Pressable
                        className="h-12 items-center justify-center border-t border-neutral-100"
                        onPress={() => setShowNextBillingDatePicker(false)}
                      >
                        <Text className="text-sm font-extrabold text-[#0ca9f2]">Kész</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View className="mt-5 rounded-2xl bg-[#f7f8fa] p-4">
              <View className="flex-row items-center justify-between">
                <View className="mr-4 flex-1">
                  <Text className="text-sm font-extrabold text-black">Próbaidő figyelés</Text>
                  <Text className="mt-1 text-xs font-semibold leading-4 text-neutral-500">
                    Szólunk a trial lejárata előtt is.
                  </Text>
                </View>
                <Pressable
                  className={trialEnabled ? "h-10 w-20 items-center justify-center rounded-full bg-[#0ca9f2]" : "h-10 w-20 items-center justify-center rounded-full bg-white"}
                  onPress={() => setTrialEnabled((current) => !current)}
                >
                  <Text
                    className={trialEnabled ? "text-sm font-extrabold text-white" : "text-sm font-extrabold text-neutral-500"}
                  >
                    {trialEnabled ? 'Igen' : 'Nem'}
                  </Text>
                </Pressable>
              </View>

              {trialEnabled ? (
                <View className="mt-4">
                  <FieldLabel label="Próbaidő vége" />
                  <Pressable
                    className="h-14 justify-center rounded-2xl bg-white px-4"
                    onPress={() => {
                      setShowTrialDatePicker(true);
                      scrollToEndAfterKeyboard();
                    }}
                  >
                    <Text className="text-base font-semibold text-black">
                      {trialEndDate || 'Válassz dátumot'}
                    </Text>
                  </Pressable>

                  {showTrialDatePicker ? (
                    <View className="mt-2 overflow-hidden rounded-2xl bg-white">
                      <DateTimePicker
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        mode="date"
                        value={parseDateInput(trialEndDate) || new Date()}
                        onChange={(event, selectedDate) => {
                          if (Platform.OS === 'android') {
                            setShowTrialDatePicker(false);
                          }

                          if (selectedDate) {
                            setTrialEndDate(formatDateInput(selectedDate));
                          }
                        }}
                      />
                      {Platform.OS === 'ios' ? (
                        <Pressable
                          className="h-12 items-center justify-center border-t border-neutral-100"
                          onPress={() => setShowTrialDatePicker(false)}
                        >
                          <Text className="text-sm font-extrabold text-[#0ca9f2]">Kész</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View className="mt-5">
              <FieldLabel label="Aktív előfizetés?" />
              <View className="flex-row rounded-2xl bg-[#f7f8fa] p-1">
                <SegmentButton label="Igen" active={isActive} onPress={() => setIsActive(true)} />
                <SegmentButton label="Nem" active={!isActive} onPress={() => setIsActive(false)} />
              </View>
            </View>
          </View>

          {isEditMode ? (
            <Pressable
              className={`mt-6 h-14 items-center justify-center rounded-2xl ${
                saving ? 'bg-neutral-400' : 'bg-red-600'
              }`}
              disabled={saving}
              onPress={handleDeleteSubscription}
            >
              <Text className="text-base font-extrabold text-white">
                {saving ? 'Mentés...' : 'Előfizetés törlése'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            className={`mt-4 h-14 items-center justify-center rounded-2xl ${
              saving ? 'bg-neutral-400' : 'bg-black'
            }`}
            disabled={saving}
            onPress={handleSave}
          >
            <Text className="text-base font-extrabold text-white">
              {saving ? 'Mentés...' : 'Előfizetés mentése'}
            </Text>
          </Pressable>
        </AnimatedScreen>
      </ScrollView>
      <BottomNavigation />
    </KeyboardAvoidingView>
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

function FieldLabel({ label }) {
  return (
    <Text className="mb-2 text-sm font-extrabold text-neutral-700">{label}</Text>
  );
}

function SegmentButton({ label, active, onPress }) {
  return (
    <Pressable
      className={`h-12 flex-1 items-center justify-center rounded-xl ${
        active ? 'bg-[#0ca9f2]' : ''
      }`}
      onPress={onPress}
    >
      <Text className={`text-sm font-extrabold ${active ? 'text-white' : 'text-neutral-500'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDateInput(value) {
  if (!value) {
    return '';
  }

  const date = parseDateInput(value);

  if (!date) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
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

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5 8 12l7 7"
        stroke="#111"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: '#f7f8fa',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
});
