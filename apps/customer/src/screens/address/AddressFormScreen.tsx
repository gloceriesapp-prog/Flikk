// Real saved-address form — reached only via LocationSearchScreen's own
// intent='address-book' branch (a real map pin already picked by the
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
// reached from (Checkout -> AddressList -> LocationSearch -> here).

import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { createAddress } from '../../api/addresses';
import { fetchAccountInfo } from '../../api/auth';
import { ApiError } from '../../api/client';
import type { AppStackParamList } from '../../navigation/types';
import { AddressTypePicker } from './components/AddressTypePicker';
import { ConfirmAddressSheet } from './components/ConfirmAddressSheet';
import { LocationDetailsCard } from './components/LocationDetailsCard';
import { OrderingForToggle, type OrderingFor } from './components/OrderingForToggle';
import { ReceiverDetailsCard } from './components/ReceiverDetailsCard';

type Props = NativeStackScreenProps<AppStackParamList, 'AddressForm'>;

const ACCENT = '#1447E6';

export function AddressFormScreen({ route, navigation }: Props) {
  const { latitude, longitude, addressLabel, city } = route.params;
  const insets = useSafeAreaInsets();

  const [building, setBuilding] = useState('');
  // Not prefilled from addressLabel — LocationDetailsCard's own pin-preview
  // row already shows the full reverse-geocoded label right below this
  // field, so pre-filling street with the same text just duplicated it
  // twice on screen. Left blank for the user to type the actual street
  // name, same as building.
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [orderingFor, setOrderingFor] = useState<OrderingFor>('myself');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [accountPhone, setAccountPhone] = useState<string | null>(null);
  const [label, setLabel] = useState('Home');
  const [customName, setCustomName] = useState('');
  const [instructions, setInstructions] = useState('');

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Best-effort only — a failed fetch just leaves "Myself" behaving like
    // "Someone else" (real fields to fill in, nothing to auto-fill), same
    // tolerance as every other background read in this app; it never
    // blocks the form.
    fetchAccountInfo()
      .then(({ phone, name }) => {
        setAccountPhone(phone);
        setAccountName(name);
        setRecipientPhone(phone);
        if (name) setRecipientName(name);
      })
      .catch(() => {});
  }, []);

  // "Myself" pulls straight from the account (phone always known from
  // login OTP; name only if the profile actually has one set — if not,
  // the name field still shows so a required field never silently stays
  // empty). "Someone else" clears both — reusing the account holder's own
  // details for a delivery explicitly meant for someone else would be the
  // wrong default, not a convenience.
  function handleChangeOrderingFor(next: OrderingFor) {
    setOrderingFor(next);
    if (next === 'myself') {
      setRecipientPhone(accountPhone ?? '');
      setRecipientName(accountName ?? '');
    } else {
      setRecipientPhone('');
      setRecipientName('');
    }
  }

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
      // Modal is a native overlay, not scoped to this screen's place in
      // the stack — navigating away without closing it first left it
      // floating on top of Checkout (navigate('Checkout') brings an
      // already-mounted screen back into focus, it doesn't remount this
      // one and tear the Modal down with it).
      setConfirmVisible(false);
      navigation.navigate('Checkout');
    } catch (err) {
      setConfirmVisible(false);
      setError(err instanceof ApiError ? err.message : 'Could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
        <View className="flex-row items-center gap-3 bg-white px-5 pb-3 pt-safe-offset-3">
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-10 w-10 items-center justify-center">
            <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[17px] font-medium text-ink" numberOfLines={1}>
              {city}
            </Text>
            <Text className="text-xs text-ink/45" numberOfLines={1}>
              {addressLabel}
            </Text>
          </View>
        </View>

        {/* KeyboardAwareScrollView, not a plain ScrollView + KeyboardAvoidingView
            — a fixed 'padding' shift only resizes the whole screen for the
            keyboard, it never scrolls a specific focused field into view.
            The bottom fields here (landmark, rider instructions) sat lower
            than that shift could reach, so they ended up rendered right
            behind the keyboard the moment they were focused — this
            auto-scrolls whichever input is focused above the keyboard
            instead. bottomOffset reserves room for the fixed "Confirm
            address" footer below this scroll view, which the keyboard sits
            on top of but isn't part of the scrollable content. */}
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-4 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bottomOffset={110}
        >
          <View className="gap-3 rounded-2xl bg-white p-4">
            <Text className="text-[15px] font-medium text-ink">Who are you ordering for?</Text>
            <OrderingForToggle value={orderingFor} onChange={handleChangeOrderingFor} />
            {orderingFor === 'myself' && accountName ? (
              <Text className="text-[13px] text-ink/45">
                Delivered to <Text className="font-semibold text-ink/70">{accountName}</Text> · {accountPhone}
              </Text>
            ) : null}
          </View>

          {orderingFor === 'someone_else' ? (
            <ReceiverDetailsCard
              name={recipientName}
              phone={recipientPhone}
              onChangeName={setRecipientName}
              onChangePhone={setRecipientPhone}
            />
          ) : !accountName ? (
            // Myself, but no name on the account yet — still a required
            // field, so it stays visible instead of pretending it's filled.
            <ReceiverDetailsCard
              name={recipientName}
              phone={recipientPhone}
              onChangeName={setRecipientName}
              onChangePhone={setRecipientPhone}
            />
          ) : null}

          <View className="gap-3 rounded-2xl bg-white p-4">
            <Text className="text-[15px] font-medium text-ink">What should we call this place?</Text>
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

          <View className="gap-3 rounded-2xl bg-white p-4">
            <Text className="text-[15px] font-medium text-ink">
              Any instructions for the rider? <Text className="text-ink/40">(optional)</Text>
            </Text>
            <View className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
              <TextInput
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Leave at door, call before arriving..."
                placeholderTextColor="#9AA5A3"
                multiline
                className="min-h-[40px] text-base text-ink font-medium"
              />
            </View>
          </View>

          {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}
        </KeyboardAwareScrollView>

        {/* pb-safe-offset-4's bottom padding exists to clear the home
            indicator/nav-bar when the keyboard is closed — with it open,
            the keyboard itself already sits there, so that same padding
            just reads as dead space between this button and the keys.
            offset.opened pushes the view DOWN by that same inset (positive
            = toward the keyboard for this component) to cancel it out the
            moment the keyboard's up; offset.closed stays 0 so the resting
            state is untouched. (Was -insets.bottom — verified live that
            direction was backwards, it widened the gap instead of closing it.) */}
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }} className="bg-white px-5 pb-safe-offset-4 pt-3 shadow-sm shadow-black/5">
          <Pressable
            onPress={() => setConfirmVisible(true)}
            disabled={!canReview}
            className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
            style={{ backgroundColor: canReview ? ACCENT : `${ACCENT}55` }}
          >
            <Text className="text-lg font-medium text-white">Confirm address</Text>
          </Pressable>
        </KeyboardStickyView>

        <ConfirmAddressSheet
          visible={confirmVisible}
          label={savedLabel}
          fullAddress={landmark.trim() ? `${line1} (near ${landmark.trim()})` : line1}
          recipientName={recipientName.trim()}
          recipientPhone={recipientPhone.trim()}
          instructions={instructions}
          saving={saving}
          onEdit={() => setConfirmVisible(false)}
          onConfirm={handleConfirmSave}
        />
    </View>
  );
}
