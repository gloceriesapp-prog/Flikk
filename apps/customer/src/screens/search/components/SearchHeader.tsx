// Real, typeable search input — the Home search bar (HomeSearchBar.tsx) is
// just a button that opens this screen; actual typing only happens here.
//
// Mic is a plain icon for now, not wired to expo-speech-recognition yet —
// that package's JS wrapper calls requireNativeModule("ExpoSpeechRecognition")
// at import time (ExpoSpeechRecognitionModule.js's own top-level call),
// which throws immediately just from being imported on a JS-only runtime
// (Expo Go, or a dev client built before this native module was added) —
// "Cannot find native module 'ExpoSpeechRecognition'" was a real crash,
// not a call-time error a try/catch could catch. The package + its config
// plugin (app.config.js) are already in place; wiring this back in is
// real work, not a revert, once there's an actual native rebuild
// (`npx expo prebuild` / a new EAS dev-client build) to link it against —
// deferred for later per an explicit ask, not forgotten.

import { ArrowLeft01Icon, Mic01Icon } from '@hugeicons/core-free-icons';
import { Pressable, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onBack: () => void;
}

export function SearchHeader({ value, onChangeText, onBack }: Props) {
  return (
    <View className="flex-row items-center gap-3 border-b border-mist px-5 pb-3 pt-safe">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus
        placeholder="Search in Groceries & Essentials"
        placeholderTextColor="#9AA5A3"
        className="flex-1 py-2 text-lg text-ink"
      />
      <Pressable hitSlop={10} className="h-9 w-9 items-center justify-center">
        <AppIcon icon={Mic01Icon} size={20} color={colors.ink} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}
