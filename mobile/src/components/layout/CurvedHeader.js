import React from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';

export default function CurvedHeader({
  title,
  subtitle,
  left,
  right,
  children,
  compact = false,
}) {
  return (
    <View className={`rounded-b-[36px] bg-[#19386e] px-5 pt-14 ${compact ? 'pb-14' : 'pb-24'}`}>
      <StatusBar barStyle="light-content" backgroundColor="#19386e" />
      <View className="flex-row items-center justify-between">
        <View className="h-12 min-w-12 items-start justify-center">{left}</View>
        <View className="mx-3 flex-1 items-center">
          <Text className="text-center text-base font-extrabold text-white">{title}</Text>
          {!!subtitle && (
            <Text className="mt-1 text-center text-xs font-semibold text-white/65">
              {subtitle}
            </Text>
          )}
        </View>
        <View className="h-12 min-w-12 items-end justify-center">{right}</View>
      </View>
      {children}
    </View>
  );
}

export function HeaderIconButton({ children, onPress, dark = false }) {
  return (
    <Pressable
      className={`h-12 w-12 items-center justify-center rounded-2xl ${
        dark ? 'bg-black' : 'bg-white'
      }`}
      style={({ pressed }) => [
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 3,
        },
        pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}
