// Keeps bottom buttons above the keyboard by padding the bottom by the
// keyboard height, on both platforms. Android draws edge-to-edge, so the
// window no longer resizes and RN's KeyboardAvoidingView leaves the footer
// hidden behind the keyboard (seen on a OnePlus, Android 14). And a screen
// pushed while the keyboard is already open (Login -> OTP, both autoFocus)
// gets no new show event, so KeyboardAvoidingView never pads it on either
// platform — seed from Keyboard.metrics() on mount instead.
// apps/customer solved the same thing with react-native-keyboard-controller,
// which needs Reanimated autolinked — rider excludes it.
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, View, type ViewProps } from 'react-native';

// iOS fires Will* before the animation (smoother); Android only fires Did*.
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

// Extra props pass through: DismissKeyboardView injects its touch handlers into its child.
export function KeyboardAvoider({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(() => Keyboard.metrics()?.height ?? 0);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(HIDE, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View {...rest} style={[{ flex: 1, paddingBottom: keyboardHeight }, style]}>
      {children}
    </View>
  );
}
