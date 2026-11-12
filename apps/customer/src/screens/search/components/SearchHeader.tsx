// Real, typeable search input — the Home search bar (HomeSearchBar.tsx) is
// just a button that opens this screen; actual typing only happens here.
// One grey pill: back chevron, the input, and a clear button once typed.
// While empty it shows the same rolling "Search "rice"" hint as Home (or the
// admin home.search.placeholder copy when set). No voice search:
// expo-speech-recognition isn't linked in the native builds.

import { Pressable, Text, TextInput, View } from 'react-native';
import { GILROY } from '../../../theme/fonts';
import { useCopy } from '../../../api/appConfig';
import { IconlyChevronLeft } from '../../../components/icons/IconlyChevronLeft';
import { IconlyClose } from '../../../components/icons/IconlyClose';
import { RotatingSearchHint } from '../../home/components/RotatingSearchHint';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onBack: () => void;
  // Keyboard search key: show the full results.
  onSubmit?: () => void;
  embedded?: boolean;
  placeholderText?: string;
}

export function SearchHeader({ value, onChangeText, onBack, onSubmit, embedded = false, placeholderText }: Props) {
  const configuredPlaceholder = useCopy('home.search.placeholder');
  const placeholder = placeholderText ?? configuredPlaceholder;
  return (
    <View className={embedded ? "px-2 pb-2" : "px-4 pb-2 pt-safe"}>
      <View className="mt-2 flex-row items-center pl-1.5 pr-2" style={{ height: 52, borderRadius: 16, backgroundColor: '#EEF0F4' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <IconlyChevronLeft size={22} color="#101C10" />
        </Pressable>
        <View className="flex-1 justify-center pl-1" style={{ height: 44 }}>
          {/* The hint sits under the input and never takes a touch. */}
          {value.length === 0 ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 4, right: 0 }}>
              {placeholder ? (
                <Text numberOfLines={1} className="text-base font-medium text-ink/55">{placeholder}</Text>
              ) : <RotatingSearchHint />}
            </View>
          ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            autoFocus
            accessibilityLabel="Search products"
            multiline={false}
            numberOfLines={1}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            className="text-ink"
            style={{ height: 44, paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0,
              fontFamily: GILROY.medium, fontSize: 16, includeFontPadding: false, textAlignVertical: 'center' }}
          />
        </View>
        {value.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={8} className="h-9 w-9 items-center justify-center">
            <IconlyClose size={20} color="#101C10" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
