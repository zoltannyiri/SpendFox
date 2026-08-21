import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const InAppNotificationBanner = ({ notification, onClose, onAction }) => {
  const translateY = useRef(new Animated.Value(-120)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 8,
      onPanResponderMove: (_, gestureState) => {
        dragY.setValue(Math.min(40, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -24 || Math.abs(gestureState.vy) > 0.9) {
          Animated.timing(translateY, {
            toValue: -140,
            duration: 180,
            useNativeDriver: true,
          }).start(onClose);
          return;
        }

        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    dragY.setValue(0);
    translateY.setValue(-120);

    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [dragY, notification?.id, translateY]);

  if (!notification) {
    return null;
  }

  const bannerTranslateY = Animated.add(translateY, dragY);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          transform: [{ translateY: bannerTranslateY }],
        },
      ]}
    >
      <Pressable
        onPress={notification.actionLabel ? onAction : undefined}
        style={styles.banner}
      >
        <View style={styles.icon}>
          <Text style={styles.iconText}>S</Text>
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>
            {notification.title || 'SpendFox'}
          </Text>
          <Text numberOfLines={2} style={styles.body}>
            {notification.body || 'Új értesítés érkezett.'}
          </Text>
        </View>
        {notification.actionLabel ? (
          <Text style={styles.action}>{notification.actionLabel}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    left: 16,
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 9999,
  },
  banner: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 22,
    elevation: 10,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  content: {
    flex: 1,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  action: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default InAppNotificationBanner;
