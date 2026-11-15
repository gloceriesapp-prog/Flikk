import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { HomeIcon } from '../../../components/icons/HomeIcon';
import { PlusBoxIcon } from '../../../components/icons/PlusBoxIcon';
import { IconlyChevronRight } from '../../../components/icons/iconly';
import { mapAddressLabel } from '../../../features/delivery-address/mapAddress';
import { colors } from '../../../theme/tokens';
import type { ApiAddress } from '../../../api/addresses';

const ACCENT = '#155DFC';
interface Props {
  visible: boolean;
  addresses: ApiAddress[];
  selectedId?: string | null;
  selectingId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}

// This sheet only selects a delivery pin; address details stay in the address book.
export function AddressSelectSheet({ visible, addresses, selectedId, selectingId, onClose, onSelect, onAddNew }: Props) {
  const busy = selectingId !== null;
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <Pressable accessible={false} className="flex-1 justify-end bg-black/50" onPress={onClose}>
      <Pressable accessible={false} accessibilityViewIsModal onPress={event => event.stopPropagation()} className="rounded-t-2xl bg-white px-5 pb-safe-offset-4 pt-4" style={{ maxHeight: '75%' }}>
        <View className="mb-1 flex-row items-center gap-3">
          <Text accessibilityRole="header" className="flex-1 text-[20px] font-semibold text-ink">Where Should We Deliver?</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8} className="h-10 w-10 items-center justify-center">
            <AppIcon icon={Cancel01Icon} size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add new address" disabled={busy} onPress={onAddNew}
            className="min-h-[76px] flex-row items-center gap-3 border-b border-gray-200 py-4">
            <View className="h-11 w-11 items-center justify-center"><PlusBoxIcon color={ACCENT} /></View>
            <Text className="text-[16px] font-semibold" style={{ color: ACCENT }}>Add new address</Text>
          </Pressable>
          {addresses.map((address, index) => <Pressable key={address.id} accessibilityRole="button"
            accessibilityLabel={`Deliver to ${address.label}`}
            accessibilityState={{ selected: selectedId === undefined ? address.is_default : address.id === selectedId, disabled: busy }}
            onPress={() => onSelect(address.id)} disabled={busy}
            className={`min-h-[80px] flex-row items-center gap-3 bg-white py-4 ${index < addresses.length - 1 ? 'border-b border-gray-100' : ''}`}>
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-gray-100"><HomeIcon size={24} /></View>
            <View className="min-w-0 flex-1 gap-1">
              <Text numberOfLines={1} ellipsizeMode="tail" className="text-[16px] font-semibold text-ink">{address.label}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" className="text-[14px] leading-5 text-ink/60">{mapAddressLabel(address)}</Text>
            </View>
            {selectingId === address.id ? <ActivityIndicator color={ACCENT} /> : <IconlyChevronRight size={20} color="#6B7280" />}
          </Pressable>)}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
