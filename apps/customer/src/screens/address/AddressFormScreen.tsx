// Real saved-address form — reached only via LocationSearch/MapConfirm's
// own intent='address-book' branch (a real map pin already picked by the
// time this screen shows). Collects everything a real quick-commerce app
// asks for once, per this session's own explicit field list:
//
// Required: full address text (building/street, prefilled from the map's
// reverse geocode but editable), recipient name, recipient phone
// (prefilled from the account's own verified number, editable for
// "delivering to someone else"). Optional: landmark, address label
// (Home/Work/Other, with a custom name for Other), delivery instructions.
//
// A "Confirm your address" sheet (ConfirmAddressSheet) stands between
// tapping Save and the real POST /addresses call — catching a typo before
// it becomes the address every future order silently reuses is worth one
// extra tap. Saves via POST /addresses (backend/src/routes/addresses.ts) —
// a first address becomes the account's default automatically (that
// route's own note), so from here on every checkout just reuses it.
// navigation.navigate('Checkout') at the end pops back to whatever screen
// in the stack is already named Checkout, however deep this form was
// reached from (Checkout -> AddressList -> LocationSearch -> MapConfirm ->
// here).

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ArrowLeft01Icon, NoteIcon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { createAddress } from '../../api/addresses';
import { fetchAccountInfo } from '../../api/auth';
import { ApiError } from '../../api/client';
import type { AppStackParamList } from '../../navigation/types';
import { AddressTypePicker } from './components/AddressTypePicker';
import { ConfirmAddressSheet } from './components/ConfirmAddressSheet';
import { LocationDetailsCard } from './components/LocationDetailsCard';
import { ReceiverDetailsCard } from './components/ReceiverDetailsCard';

type Props = NativeStackScreenProps<AppStackParamList, 'AddressForm'>;

export function AddressFormScreen({ route, navigation }: Props) {
  const { latitude, longitude, addressLabel, city } = route.params;

  const [building, setBuilding] = useState('');
  const [street, setStreet] = useState(addressLabel);
  const [landmark, setLandmark] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [accountPhone, setAccountPhone] = useState<string | null>(null);
  const [label, setLabel] = useState('Home');
  const [customName, setCustomName] = useState('');
  const [instructions, setInstructions] = useState('');

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Best-effort only — a failed fetch just leaves the phone field blank
    // and the "Use mine" shortcut hidden, same tolerance as every other
    // background read in this app; it never blocks the form.
    fetchAccountInfo()
      .then(({ phone }) => setAccountPhone(phone))
      .catch(() => {});
  }, []);

  const line1 = [building.trim(), street.trim()].filter(Boolean).join(', ');
  const savedLabel = label === 'Other' ? customName.trim() || 'Other' : label;
  const canReview =
    building.trim().length > 0 && recipientName.trim().length > 0 && recipientPhone.trim().length > 0 && (label !== 'Other' || customName.trim().length > 0);

  async function handleConfirmSave() {
    setError(null);
    setSaving(true);
    try {
      await createAddress({
        label: savedLabel,
        line1,
        landmark: landmark.trim() || undefined,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        delivery_instructions: instructions.trim() || undefined,
        latitude,
        longitude,
      });
      navigation.navigate('Checkout');
    } catch (err) {
      setConfirmVisible(false);
      setError(err instanceof ApiError ? err.message : 'Could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white pt-safe">
        <View className="flex-row items-center gap-3 px-5 py-3">
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink" numberOfLines={1}>
              {city}
            </Text>
            <Text className="text-xs text-ink/50" numberOfLines={1}>
              {addressLabel}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
          <ReceiverDetailsCard
            name={recipientName}
            phone={recipientPhone}
            accountPhone={accountPhone}
            onChangeName={setRecipientName}
            onChangePhone={setRecipientPhone}
          />

          <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-sm font-bold text-ink">Save this address as</Text>
            <AddressTypePicker label={label} customName={customName} onSelectPreset={setLabel} onChangeCustomName={setCustomName} />
          </View>

          <LocationDetailsCard
            building={building}
            street={street}
            landmark={landmark}
            pinnedArea={addressLabel}
            onChangeBuilding={setBuilding}
            onChangeStreet={setStreet}
            onChangeLandmark={setLandmark}
            onChangePin={() => navigation.navigate('LocationSearch', { intent: 'address-book' })}
          />

          <View className="gap-2 rounded-2xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={NoteIcon} size={15} color={`${colors.ink}80`} />
              <Text className="text-sm font-bold text-ink">Delivery instructions (optional)</Text>
            </View>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Leave at door, call before arriving..."
              placeholderTextColor="#9AA5A3"
              multiline
              className="min-h-[40px] text-base text-ink"
            />
          </View>

          {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}
        </ScrollView>

        <View className="px-5 pb-safe-offset-4 pt-2">
          <PrimaryButton label="Review address" onPress={() => setConfirmVisible(true)} disabled={!canReview} />
        </View>

        <ConfirmAddressSheet
          visible={confirmVisible}
          label={savedLabel}
          fullAddress={landmark.trim() ? `${line1} (near ${landmark.trim()})` : line1}
          recipientName={recipientName.trim()}
          recipientPhone={recipientPhone.trim()}
          saving={saving}
          onEdit={() => setConfirmVisible(false)}
          onConfirm={handleConfirmSave}
        />
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
