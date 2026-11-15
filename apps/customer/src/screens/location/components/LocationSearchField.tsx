import type { Ref } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { IconlySearch } from '../../../components/icons/iconly';
import { GILROY } from '../../../theme/fonts';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  inputRef?: Ref<TextInput>;
  loading?: boolean;
}

/** Shared sizing and baseline alignment for saved-address and map search. */
export function LocationSearchField({ value, onChangeText, onSubmit, inputRef, loading }: Props) {
  return <View style={styles.field}>
    <IconlySearch size={22} color="#59616B" />
    <TextInput ref={inputRef} value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit}
      accessibilityLabel="Search an area or address" placeholder="Search an area or address"
      placeholderTextColor="#89919B" returnKeyType="search" autoCorrect={false} autoCapitalize="words"
      textAlignVertical="center" style={styles.input} />
    {loading ? <ActivityIndicator size="small" color="#1447e6" /> : null}
  </View>;
}
const styles = StyleSheet.create({
  field: { height: 48, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16,
    borderWidth: 1, borderColor: '#DDE1E6', backgroundColor: '#FFFFFF', paddingHorizontal: 14 },
  input: { flex: 1, minWidth: 0, height: 46, paddingVertical: 0, paddingHorizontal: 0,
    includeFontPadding: false, fontFamily: GILROY.medium, fontSize: 15, color: '#101C10' },
});
