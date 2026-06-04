import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'native-base';

export default function FooterComponent({ height = 96 }) {
  return (
    <View style={[styles.container, { minHeight: height }]}>
      <Text color="#64748b" fontSize="xs">
        SpendFox
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
