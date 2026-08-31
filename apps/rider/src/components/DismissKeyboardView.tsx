// Tap anywhere outside a focused input to dismiss the keyboard — standard
// RN pattern (TouchableWithoutFeedback wrapping the screen), not custom
// logic per screen. Only used on non-scrolling screens (auth flow) — a
// ScrollView-containing screen should use keyboardDismissMode="on-drag"
// on the ScrollView itself instead, wrapping one in this blocks its own
// drag/scroll gesture (see apps/customer's own AddressFormScreen.tsx fix
// for that exact bug).

import type { ReactElement } from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export function DismissKeyboardView({ children }: { children: ReactElement }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}
