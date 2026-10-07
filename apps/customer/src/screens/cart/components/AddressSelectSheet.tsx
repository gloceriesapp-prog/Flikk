// Cart's own "Select address" bottom sheet — RN-core Modal + slide (same
// pattern ConfirmAddressSheet already uses, not a third-party bottom-sheet
// dependency), not the full AddressListScreen. Height comes from its own
// content (one row per real saved address, api/addresses.ts), not a fixed
// screen — two addresses on file makes a short sheet, five makes a taller
// one, capped by maxHeight so a genuinely long list still scrolls instead
// of running off-screen.
//
// Tapping an address sets it default (PATCH /addresses/:id/default) and
// closes straight into Checkout — same real behavior AddressListScreen's
// own handleSelect has, just without leaving Cart for a separate screen
// first. The trash icon really deletes (DELETE /addresses/:id, a real
// confirm Alert first since it's not reversible) — a customer with the
// wrong old address on file needs a way to get rid of it without deleting
// their whole account.
//
// The select-row and the delete button are two SIBLING Pressables inside
// a plain View, not one nested inside the other — nesting a Pressable
// inside another Pressable's onPress handler meant tapping delete also
// fired onSelect underneath it (row navigated away to Checkout before the
// delete Alert's own callback ever ran), which is why delete looked like
// it silently did nothing.

import { AddCircleIcon, Cancel01Icon, Delete02Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';

interface Props {
  visible: boolean;
  addresses: ApiAddress[];
  selectingId: string | null;
  deletingId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export function AddressSelectSheet({ visible, addresses, selectingId, deletingId, onClose, onSelect, onDelete, onAddNew }: Props) {
  function confirmDelete(address: ApiAddress) {
    Alert.alert('Remove this address?', `${address.label} · ${address.line1}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(address.id) },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        {/* Floating close button, centered above the sheet's own top edge
            — same circular black/70 + white Cancel01Icon treatment
            ProductDetailSheet.tsx/ForgotToAddModal.tsx already use for
            this exact "close a sheet floating over a dark backdrop"
            pattern, per an explicit ask. Sits on the backdrop Pressable
            (not inside the sheet's own stopPropagation wrapper below), so
            it keeps working as a real "close" tap. */}
        <View pointerEvents="box-none" className="items-center pb-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/70"
          >
            <AppIcon icon={Cancel01Icon} size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>

        <Pressable onPress={(e) => e.stopPropagation()} className="rounded-t-3xl bg-white px-5 pb-safe-offset-4 pt-4" style={{ maxHeight: '75%' }}>
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-gray-200" />
          <Text className="mb-3 text-lg font-bold text-ink">Select address</Text>

          <ScrollView contentContainerClassName="gap-2.5" showsVerticalScrollIndicator={false}>
            {addresses.map((address) => {
              const busy = selectingId !== null || deletingId !== null;
              return (
                <View
                  key={address.id}
                  className="flex-row items-center gap-2 rounded-2xl border px-2.5 py-2.5"
                  style={{ borderColor: address.is_default ? ACCENT : '#E5E7EB', backgroundColor: address.is_default ? `${ACCENT}0D` : '#FFFFFF' }}
                >
                  <Pressable onPress={() => onSelect(address.id)} disabled={busy} className="flex-1 flex-row items-center gap-3 px-1.5 py-1">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-mist">
                      <AppIcon icon={Location01Icon} size={16} color={colors.ink} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-bold text-ink">{address.label}</Text>
                        {address.is_default ? (
                          <View className="rounded-full bg-lime-soft px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-lime-deep">Default</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-[13px] text-ink/60" numberOfLines={1}>
                        {address.recipient_name}
                        {address.recipient_phone ? ` · ${address.recipient_phone}` : ''}
                      </Text>
                      <Text className="text-[13px] text-ink/60" numberOfLines={2}>
                        {address.line1}
                      </Text>
                    </View>
                    {selectingId === address.id ? <ActivityIndicator color={ACCENT} /> : null}
                  </Pressable>

                  {deletingId === address.id ? (
                    <ActivityIndicator color={colors.danger} style={{ marginHorizontal: 8 }} />
                  ) : (
                    <Pressable accessibilityRole="button" accessibilityLabel="Delete address" onPress={() => confirmDelete(address)} disabled={busy} hitSlop={10} className="p-2">
                      <AppIcon icon={Delete02Icon} size={17} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              );
            })}

            <Pressable
              onPress={onAddNew}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-3.5"
            >
              <AppIcon icon={AddCircleIcon} size={16} color={colors.ink} />
              <Text className="text-sm font-bold text-ink">Add new address</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
