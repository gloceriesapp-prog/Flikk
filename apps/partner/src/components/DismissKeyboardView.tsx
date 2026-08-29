// Tap anywhere outside a focused input to dismiss the keyboard — standard
// RN pattern (TouchableWithoutFeedback wrapping the screen), not custom
// logic per screen. Wraps a single child (every screen using this passes
// its own KeyboardAvoidingView/View root) — a normal Pressable inside that
// child (a button, a category chip) still receives its own press
// normally, this only catches taps that land on empty space.

import type { ReactElement } from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export function DismissKeyboardView({ children }: { children: ReactElement }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}
