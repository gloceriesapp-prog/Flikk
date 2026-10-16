import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function failureMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not save. Please retry.';
}

export function ManagementPage({ title, children, scroll = true }: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const navigation = useNavigation();
  return (
    <View className="flex-1 bg-[#F7F8FA] pb-safe pt-safe">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} className="px-5 py-4">
        <Text className="text-base font-semibold">Back · {title}</Text>
      </Pressable>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
          {children}
        </ScrollView>
      ) : children}
    </View>
  );
}

export function ManagementButton({ label, onPress, disabled = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      className="rounded-xl bg-[#1557FF] px-4 py-3" style={{ opacity: disabled ? 0.5 : 1 }}>
      <Text className="text-center font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
