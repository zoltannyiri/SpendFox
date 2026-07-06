import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const TABS = [
  { route: 'HomeScreen', label: 'Kezdőlap', icon: HomeIcon },
  { route: 'Subscriptions', label: 'Előfizetések', icon: SubscriptionsIcon },
  { route: 'SubscriptionsForm', label: 'Új', icon: PlusIcon, primary: true },
  { route: 'ProfileScreen', label: 'Profil', icon: ProfileIcon },
  { route: 'ProfileSettingsScreen', label: 'Beállítások', icon: SettingsIcon },
];

const ROUTE_GROUPS = {
  HomeScreen: ['HomeScreen'],
  Subscriptions: ['Subscriptions'],
  SubscriptionsForm: ['SubscriptionsForm'],
  ProfileScreen: ['ProfileScreen'],
  ProfileSettingsScreen: ['ProfileSettingsScreen', 'ProfileSettingsForm'],
};

export default function BottomNavigation() {
  const navigation = useNavigation();
  const route = useRoute();

  return (
    <View className="absolute inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 px-4 pb-5 pt-2">
      <View className="flex-row items-center justify-between">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = ROUTE_GROUPS[tab.route]?.includes(route.name);

          if (tab.primary) {
            return (
              <Pressable
                key={tab.route}
                className="h-14 w-14 items-center justify-center rounded-full bg-black"
                style={({ pressed }) => [pressed && { opacity: 0.82 }]}
                onPress={() => navigation.navigate(tab.route)}
              >
                <Icon active />
              </Pressable>
            );
          }

          return (
            <Pressable
              key={tab.route}
              className="h-12 min-w-[58px] items-center justify-center rounded-2xl"
              style={({ pressed }) => [
                active && { backgroundColor: '#eef7ff' },
                pressed && { opacity: 0.82 },
              ]}
              onPress={() => navigation.navigate(tab.route)}
            >
              <Icon active={active} />
              <Text
                className={`mt-1 text-[10px] font-extrabold ${
                  active ? 'text-[#19386e]' : 'text-neutral-400'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SvgIcon({ children, size = 21 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

function getColor(active) {
  return active ? '#19386e' : '#8c8c92';
}

function HomeIcon({ active }) {
  return (
    <SvgIcon>
      <Path
        d="M4 11.5 12 4l8 7.5V20h-5v-5H9v5H4v-8.5Z"
        stroke={getColor(active)}
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}

function SubscriptionsIcon({ active }) {
  return (
    <SvgIcon>
      <Rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="3"
        stroke={getColor(active)}
        strokeWidth="1.8"
      />
      <Path
        d="M8 10h8M8 14h5"
        stroke={getColor(active)}
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}

function PlusIcon() {
  return (
    <SvgIcon size={24}>
      <Path d="M12 6v12M6 12h12" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" />
    </SvgIcon>
  );
}

function ProfileIcon({ active }) {
  return (
    <SvgIcon>
      <Circle cx="12" cy="8" r="3" stroke={getColor(active)} strokeWidth="1.8" />
      <Path
        d="M6 20c.9-4 3-6 6-6s5.1 2 6 6"
        stroke={getColor(active)}
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}

function SettingsIcon({ active }) {
  return (
    <SvgIcon>
      <Circle cx="12" cy="12" r="3" stroke={getColor(active)} strokeWidth="1.8" />
      <Path
        d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3h5l.3-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
        stroke={getColor(active)}
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </SvgIcon>
  );
}
