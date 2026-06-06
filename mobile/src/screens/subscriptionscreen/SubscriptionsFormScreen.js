import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const BILLING_CYCLES = [
  { label: 'Havi', value: 'monthly' },
  { label: 'Eves', value: 'yearly' },
  { label: 'Heti', value: 'weekly' },
];

export default function SubscriptionsFormScreen() {
  const navigation = useNavigation();

  const [currencies, setCurrencies] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('HUF');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const response = await axios.get('/dictionary/currency');
        const items = response.data?.data || [];

        setCurrencies(items);

        if (items[0]?.code && !currency) {
          setCurrency(items[0].code);
        }
      } catch (err) {
        console.log('Failed to load currency:', err?.response?.data || err?.message);
      }
    };

    loadCurrency();
  }, [currency]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorText('');

      const user = JSON.parse(storage.getString('appUser') || '{}');

      await axios.post('/subscriptions', {
        name: name.trim(),
        price: Number(price),
        currency,
        billing_cycle: billingCycle,
        is_shared: false,
        user_id: user.id,
      });

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

          <Text className="text-base font-extrabold text-black">Uj elofizetes</Text>

          <View className="h-10 w-10" />
        </View>

        <View className="rounded-2xl bg-[#0ca9f2] px-5 py-5">
          <Text className="text-sm font-bold text-white/80">SpendFox</Text>
          <Text className="mt-1 text-3xl font-extrabold text-white">
            Kovess minden havi koltseget
          </Text>
          <Text className="mt-3 text-sm font-semibold leading-5 text-white/80">
            Add hozza a szolgaltatast, arat es fizetesi ciklust. A tobbit majd
            osszeszamoljuk.
          </Text>
        </View>

        {!!errorText && (
          <View className="mt-5 rounded-2xl bg-red-50 px-4 py-3">
            <Text className="text-sm font-bold text-red-600">{errorText}</Text>
          </View>
        )}

        <View className="mt-7">
          <FieldLabel label="Nev" />
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
              <FieldLabel label="Ar" />
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
              <View className="h-14 justify-center rounded-2xl bg-white px-3">
                <Text className="text-base font-extrabold text-black">{currency}</Text>
              </View>
            </View>
          </View>

          {currencies.length > 0 && (
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
          )}

          <View className="mt-5">
            <FieldLabel label="Szamlazasi ciklus" />
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
        </View>

        <Pressable
          className={`mt-8 h-14 items-center justify-center rounded-2xl ${
            saving ? 'bg-neutral-400' : 'bg-black'
          }`}
          disabled={saving}
          onPress={handleSave}
        >
          <Text className="text-base font-extrabold text-white">
            {saving ? 'Mentes...' : 'Elofizetes mentese'}
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
