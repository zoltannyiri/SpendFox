import React, { useEffect, useState } from 'react';
import {
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
import { Alert } from 'react-native';

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
  const [name, setName] = useState(editingSubscription?.name || '');
  const [price, setPrice] = useState(
    editingSubscription?.price === undefined ? '' : String(editingSubscription.price)
  );
  const [currency, setCurrency] = useState(editingSubscription?.currency || 'HUF');
  const [billingCycle, setBillingCycle] = useState(
    editingSubscription?.billing_cycle || 'monthly'
  );
  const [isActive, setIsActive] = useState(
    editingSubscription?.is_active ?? true
  );
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const response = await axios.get('/dictionary/currency');
        const items = response.data?.data || [];

        setCurrencies(items);

        setCurrency((currentCurrency) => currentCurrency || items[0]?.code || 'HUF');
      } catch (err) {
        console.log('Failed to load currency:', err?.response?.data || err?.message);
      }
    };

    loadCurrency();
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
      setErrorText('Nem sikerult törölni az előfizetést.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorText('');

      const user = JSON.parse(storage.getString('appUser') || '{}');

      const payload = {
        name: name.trim(),
        price: Number(price),
        currency,
        billing_cycle: billingCycle,
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
      setErrorText('Nem sikerult menteni az elofizetest.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f7f7f8]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f8" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 flex-row items-center justify-between">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </Pressable>

          {isEditMode ? (
            <Text className="text-base font-extrabold text-black">Előfizetés szerkesztése</Text>
          ) : (
            <Text className="text-base font-extrabold text-black">Új előfizetés</Text>
          )}

          <View className="h-10 w-10" />
        </View>

        <View className="rounded-2xl bg-[#0ca9f2] px-5 py-5">
          <Text className="text-sm font-bold text-white/80">SpendFox</Text>
          <Text className="mt-1 text-3xl font-extrabold text-white">
            Kövess minden havi költséget
          </Text>
          <Text className="mt-3 text-sm font-semibold leading-5 text-white/80">
            Add hozzá a szolgáltatást, árát és fizetési ciklust.
          </Text>
        </View>

        {!!errorText && (
          <View className="mt-5 rounded-2xl bg-red-50 px-4 py-3">
            <Text className="text-sm font-bold text-red-600">{errorText}</Text>
          </View>
        )}

        <View className="mt-7">
          <FieldLabel label="Név" />
          <TextInput
            className="h-14 rounded-2xl bg-white px-4 text-base font-semibold text-black"
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
                className="h-14 rounded-2xl bg-white px-4 text-base font-semibold text-black"
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
              {/* <View className="h-14 justify-center rounded-2xl bg-white px-3">
                <Text className="text-base font-extrabold text-black">{currency}</Text>
              </View> */}
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

          {/* {currencies.length > 0 && (
            <View className="mt-3 flex-row flex-wrap">
              {currencies.map((item) => {
                const active = item.code === currency;

                return (
                  <Pressable
                    key={item.code}
                    className={`mb-2 mr-2 rounded-full px-4 py-2 ${
                      active ? 'bg-black' : 'bg-white'
                    }`}
                    onPress={() => setCurrency(item.code)}
                  >
                    <Text
                      className={`text-sm font-extrabold ${
                        active ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      {item.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )} */}

          <View className="mt-5">
            <FieldLabel label="Számlázási ciklus" />
            <View className="flex-row rounded-2xl bg-white p-1">
              {BILLING_CYCLES.map((item) => {
                const active = item.value === billingCycle;

                return (
                  <Pressable
                    key={item.value}
                    className={`h-12 flex-1 items-center justify-center rounded-xl ${
                      active ? 'bg-[#0ca9f2]' : 'bg-white'
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
            <FieldLabel label="Aktív előfizetés?" />
            <View className="flex-row rounded-2xl bg-white p-1">
              <Pressable
                className={`h-12 flex-1 items-center justify-center rounded-xl ${
                  isActive ? 'bg-[#0ca9f2]' : 'bg-white'
                }`}
                onPress={() => 
                  setIsActive(true)
                }
              >
                <Text
                  className={`text-sm font-extrabold ${
                    isActive ? 'text-white' : 'text-neutral-500'
                  }`}
                >
                  Igen
                </Text>
              </Pressable>
              <Pressable
                className={`h-12 flex-1 items-center justify-center rounded-xl ${
                  !isActive ? 'bg-[#0ca9f2]' : 'bg-white'
                }`}
                onPress={() =>
                  setIsActive(false)
                }
              >
                <Text
                  className={`text-sm font-extrabold ${
                    !isActive ? 'text-white' : 'text-neutral-500'
                  }`}
                >
                  Nem
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        {isEditMode ? (
          <Pressable
            className={`mt-8 h-14 items-center justify-center rounded-2xl ${
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
          className={`mt-8 h-14 items-center justify-center rounded-2xl ${
            saving ? 'bg-neutral-400' : 'bg-black'
          }`}
          disabled={saving}
          onPress={handleSave}
        >
          <Text className="text-base font-extrabold text-white">
            {saving ? 'Mentes...' : 'Előfizetés mentése'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label }) {
  return (
    <Text className="mb-2 text-sm font-extrabold text-neutral-700">{label}</Text>
  );
}

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5 8 12l7 7"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: '#fff',
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
