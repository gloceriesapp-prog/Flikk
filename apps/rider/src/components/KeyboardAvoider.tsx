// Keeps bottom buttons above the keyboard. iOS uses RN's KeyboardAvoidingView.
// Android draws edge-to-edge, so the window no longer resizes and RN's
// KeyboardAvoidingView leaves the footer hidden behind the keyboard (seen on a
// OnePlus, Android 14); there we pad the bottom by the keyboard height instead.
// apps/customer solved the same thing with react-native-keyboard-controller,
// which needs Reanimated autolinked — rider excludes it.
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, View, type ViewProps } from 'react-native';

// Extra props pass through: DismissKeyboardView injects its touch handlers into its child.
export function KeyboardAvoider({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView {...rest} behavior="padding" style={[{ flex: 1 }, style]}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return (
    <View {...rest} style={[{ flex: 1, paddingBottom: keyboardHeight }, style]}>
      {children}
    </View>
  );
}
