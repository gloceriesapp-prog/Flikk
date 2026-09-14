// Reached from DeliveryModeSwitcher.tsx's middle (clipboard) icon — a
// freeform notes list ("milk, bread, eggs"), separate from the cart and
// the wishlist: this is for jotting down what's needed before shopping,
// not for products already picked. Real, persisted state
// (useShoppingListStore.ts, on-device only — no backend list/notes table
// exists yet, unlike useWishlistStore.ts which is account-backed now).
//
// Add bar pinned to the bottom (AddItemBar), items above it in a plain
// list (ShoppingListItemRow — tap to check off, X to delete). "Clear
// done" in the header only shows once at least one item is checked, so
// it's not a dead affordance sitting there from an empty list.

import { ArrowLeft01Icon, ClipboardListIcon } from '@hugeicons/core-free-icons';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useShoppingListStore } from '../../store/useShoppingListStore';
import { AddItemBar } from './components/AddItemBar';
import { ShoppingListItemRow } from './components/ShoppingListItemRow';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ShoppingList'>;

export function ShoppingListScreen({ navigation }: Props) {
  const items = useShoppingListStore((state) => state.items);
  const addItem = useShoppingListStore((state) => state.addItem);
  const toggleItem = useShoppingListStore((state) => state.toggleItem);
  const removeItem = useShoppingListStore((state) => state.removeItem);
  const clearChecked = useShoppingListStore((state) => state.clearChecked);

  const hasCheckedItems = items.some((item) => item.isChecked);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-row items-center px-2 pb-2 pt-safe-offset-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-ink">Shopping List</Text>
        <Pressable onPress={clearChecked} hitSlop={12} disabled={!hasCheckedItems} className="h-11 w-16 items-center justify-center">
          {hasCheckedItems && <Text className="text-[13px] font-medium text-ink/40">Clear done</Text>}
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <AppIcon icon={ClipboardListIcon} size={26} color={`${colors.ink}80`} strokeWidth={1.6} />
          </View>
          <Text className="text-center text-base font-semibold text-ink">Nothing on your list yet</Text>
          <Text className="text-center text-sm text-ink/50">Jot down what you need before you start shopping.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-4">
          {items.map((item) => (
            <ShoppingListItemRow
              key={item.id}
              item={item}
              onToggle={() => toggleItem(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </ScrollView>
      )}

      <AddItemBar onAdd={addItem} />
    </KeyboardAvoidingView>
  );
}
