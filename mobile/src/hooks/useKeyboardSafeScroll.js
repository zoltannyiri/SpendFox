import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export default function useKeyboardSafeScroll({
  defaultBottomPadding = 128,
  keyboardBottomPadding = 300,
  delay = Platform.OS === 'ios' ? 140 : 280,
} = {}) {
  const scrollRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollToEndAfterKeyboard = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, delay);
  }, [delay]);

  return {
    scrollRef,
    scrollToEndAfterKeyboard,
    contentContainerStyle: {
      paddingBottom: keyboardVisible ? keyboardBottomPadding : defaultBottomPadding,
    },
  };
}
