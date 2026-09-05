// Fixed input row at the bottom of ShoppingListScreen — type a note, hit
// return or the add button. Clears itself and keeps focus after each add
// so jotting down several items in a row ("milk", "bread", "eggs") doesn't
// need re-tapping the field every time.

import { useState } from 'react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Pressable, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onAdd: (text: string) => void;
}

export function AddItemBar({ onAdd }: Props) {
  const [text, setText] = useState('');

  function submit() {
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  }

  return (
    <View className="flex-row items-center gap-2.5 border-t border-gray-100 bg-white px-5 pb-safe-offset-3 pt-3">
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        blurOnSubmit={false}
        placeholder="Add an item…"
        placeholderTextColor={`${colors.ink}40`}
        returnKeyType="done"
        className="flex-1 rounded-full bg-gray-100 px-4 py-3 text-[15px] text-ink"
      />
      <Pressable
        onPress={submit}
        disabled={!text.trim()}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: text.trim() ? colors.ink : `${colors.ink}20` }}
      >
        <AppIcon icon={Add01Icon} size={20} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}
