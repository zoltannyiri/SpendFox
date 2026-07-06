import React from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';

export default function CurvedHeader({
  title,
  left,
  right,
  children,
  compact = false,
}) {
  return (
    <View className={`rounded-b-[34px] bg-[#19386e] px-5 pt-14 ${compact ? 'pb-16' : 'pb-24'}`}>
      <StatusBar barStyle="light-content" backgroundColor="#19386e" />
      <View className="flex-row items-center justify-between">
        <View className="h-12 min-w-12 items-start justify-center">
          {left}
        </View>
        <Text className="mx-3 flex-1 text-center text-base font-extrabold text-white">
          {title}
        </Text>
        <View className="h-12 min-w-12 items-end justify-center">
          {right}
        </View>
      </View>
      {children}
    </View>
  );
}

export function HeaderIconButton({ children, onPress, dark = false }) {
  return (
    <Pressable
      className={`h-12 w-12 items-center justify-center rounded-2xl ${dark ? 'bg-black' : 'bg-white'}`}
      style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}
