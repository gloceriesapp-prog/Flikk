import { useLocationStore } from '../../store/useLocationStore';
import { useAuthStore } from '../../store/useAuthStore';
// Real saved-address form — reached only via LocationSearchScreen's own
// intent='address-book' branch (a real map pin already picked by the
// time this screen shows). Collects everything a real quick-commerce app
// asks for once, per this session's own explicit field list:
//
// Required: full address text (building/street, prefilled from the map's
// reverse geocode but editable), recipient name, recipient phone
// (prefilled from the account's own verified number, editable for
// "delivering to someone else"). Building, street/area, landmark,
// and address label are required. Floor/entrance directions are optional.
//
// A "Confirm your address" sheet (ConfirmAddressSheet) stands between
// tapping Save and the real POST /addresses call — catching a typo before
// it becomes the address every future order silently reuses is worth one
// extra tap. Saves via POST /addresses (backend/src/routes/addresses.ts) —
// a first address becomes the account's default automatically (that
// route's own note), so from here on every checkout just reuses it.
// After saving, it pops back past the LocationSearch/AddressForm steps to
// whichever screen started the flow (Cart, AddressList, Profile...).
// With route.params.address it edits that saved address (PATCH) instead.

import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { createAddress, updateAddress } from '../../api/addresses';
import { fetchAccountInfo } from '../../api/auth';
import { ApiError } from '../../api/client';
import type { AppStackParamList } from '../../navigation/types';
import { addressDetailsReady } from './addressDetailsValidation';
import {
  composeDeliveryInstructions,
  parseDeliveryInstructions,
  type DeliveryInstructionId,
} from './deliveryInstructions';
import { DeliveryInstructionsCard } from './components/DeliveryInstructionsCard';
import { AddressTypePicker } from './components/AddressTypePicker';
import { ConfirmAddressSheet } from './components/ConfirmAddressSheet';
import { LocationDetailsCard } from './components/LocationDetailsCard';
import { OrderingForToggle, type OrderingFor } from './components/OrderingForToggle';
import { ReceiverDetailsCard } from './components/ReceiverDetailsCard';

type Props = NativeStackScreenProps<AppStackParamList, 'AddressForm'>;

const ACCENT = '#1447E6';

export function AddressFormScreen({ route, navigation }: Props) {
  const customerId = useAuthStore((state) => state.customerId);
  const { latitude, longitude, addressLabel, city, address: editing } = route.params;
  const editingPreset = editing && ['Home', 'Work'].includes(editing.label);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Edit mode prefills the saved line1 whole — it can't be split back into building/street.
  const [building, setBuilding] = useState(editing?.line1 ?? '');
  // Not prefilled from addressLabel — LocationDetailsCard's own pin-preview
  // row already shows the full reverse-geocoded label right below this
  // field, so pre-filling street with the same text just duplicated it
  // twice on screen. Left blank for the user to type the actual street
  // name, same as building.
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState(editing?.landmark ?? '');
  // Editing shows the saved receiver fields directly so they're visible and editable.
  const [orderingFor, setOrderingFor] = useState<OrderingFor>(editing ? 'someone_else' : 'myself');
  const [recipientName, setRecipientName] = useState(editing?.recipient_name ?? '');
  const [recipientPhone, setRecipientPhone] = useState(editing?.recipient_phone ?? '');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [accountPhone, setAccountPhone] = useState<string | null>(null);
  const [label, setLabel] = useState(editing ? (editingPreset ? editing.label : 'Other') : 'Home');
  const [customName, setCustomName] = useState(editing && !editingPreset ? editing.label : '');
  const [instructions, setInstructions] = useState(
    () => parseDeliveryInstructions(editing?.delivery_instructions).custom,
  );
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryInstructionId[]>(
    () => parseDeliveryInstructions(editing?.delivery_instructions).selected,
  );
  const deliveryInstructions = composeDeliveryInstructions(instructions, deliveryOptions);
  const optionTextLength = composeDeliveryInstructions('', deliveryOptions).length;
  const instructionsMaxLength = Math.max(
    instructions.length,
    300 - optionTextLength - (optionTextLength ? 1 : 0),
  );

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
        if (editing) return; // keep the saved receiver
        setRecipientPhone(phone);
        if (name) setRecipientName(name);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
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
    addressDetailsReady({
      building,
      street,
      landmark,
      instructions: deliveryInstructions,
      recipientName,
      recipientPhone,
      label: savedLabel,
    }) &&
    (label !== 'Other' || customName.trim().length > 0);
  const savingRef = useRef(false);

  async function handleConfirmSave() {
    if (!canReview || savingRef.current) return;
    savingRef.current = true;
    setError(null);
    setSaving(true);
    try {
      const fields = {
        label: savedLabel,
        line1,
        landmark: landmark.trim(),
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        delivery_instructions: deliveryInstructions,
        latitude,
        longitude,
        // Full address the map resolved for this pin — kept whole alongside
        // the typed building/street (line1). Re-picking on the map refreshes
        // addressLabel; editing other fields without re-picking keeps the
        // address's existing map_address.
        map_address: addressLabel?.trim() || editing?.map_address || undefined,
      };
      // A new address becomes the default in the same server transaction
      // (make_default) — picking a new location from Checkout's "Change"
      // means "deliver here", and one call means a retry can't leave a
      // duplicate behind a failed follow-up "set default".
      if (editing) await updateAddress(editing.id, fields);
      else await createAddress({ ...fields, make_default: true });
      if (!editing || editing.is_default) {
        await useLocationStore
          .getState()
          .setLocation({ latitude, longitude, addressLabel: fields.map_address || line1, city })
          .catch(() => {
            console.warn('[AddressForm] Could not persist the selected delivery pin.');
          });
      }
      // Real invalidation, not left to chance — Checkout's own useQuery
      // (['addresses']) is a still-mounted screen underneath this one
      // (popTo('Cart') below brings it back into focus rather than
      // remounting it), so it would otherwise keep serving its stale
      // cached list and never see this new address at all.
      await queryClient.invalidateQueries({ queryKey: ['addresses', customerId] });
      // Modal is a native overlay, not scoped to this screen's place in
      // the stack — navigating away without closing it first left it
      // floating on top of Cart (popTo('Cart') brings an
      // already-mounted screen back into focus, it doesn't remount this
      // one and tear the Modal down with it).
      setConfirmVisible(false);
      // Pop the LocationSearch/AddressForm steps; land on whoever started the flow.
      const routes = navigation.getState().routes;
      let origin = routes.length - 1;
      while (origin > 0 && ['AddressForm', 'LocationSearch'].includes(routes[origin]!.name))
        origin--;
      navigation.pop(Math.max(routes.length - 1 - origin, 1));
    } catch (err) {
      setConfirmVisible(false);
      setError(
        err instanceof ApiError ? err.message : 'Could not save this address. Please try again.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <View className="flex-row items-center gap-3 bg-white px-5 pb-3 pt-safe-offset-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center"
        >
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
        contentContainerClassName="gap-2 px-4 pb-3 pt-2"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={110}
      >
        <View className="gap-3 rounded-2xl bg-white p-4">
          <Text accessibilityRole="header" className="text-[16px] font-semibold text-black">
            Who are you ordering for?
          </Text>
          <OrderingForToggle value={orderingFor} onChange={handleChangeOrderingFor} />
          {orderingFor === 'myself' && accountName ? (
            <Text className="text-[13px] text-ink/45">
              Delivered to <Text className="font-semibold text-ink/70">{accountName}</Text> ·{' '}
              {accountPhone}
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
          <Text accessibilityRole="header" className="text-[16px] font-semibold text-black">
            What should we call this place?
          </Text>
          <AddressTypePicker
            label={label}
            customName={customName}
            onSelectPreset={setLabel}
            onChangeCustomName={setCustomName}
          />
        </View>

        <LocationDetailsCard
          building={building}
          street={street}
          landmark={landmark}
          instructions={instructions}
          instructionsMaxLength={instructionsMaxLength}
          pinnedArea={addressLabel}
          onChangeBuilding={setBuilding}
          onChangeStreet={setStreet}
          onChangeLandmark={setLandmark}
          onChangeInstructions={setInstructions}
          // ponytail: editing keeps the saved pin; moving it means adding a new address
          // until LocationSearch can carry an address id through to this form.
          onChangePin={
            editing
              ? undefined
              : () => navigation.navigate('LocationSearch', { intent: 'address-book' })
          }
        />

        <DeliveryInstructionsCard
          selected={deliveryOptions}
          custom={instructions}
          onChange={setDeliveryOptions}
        />

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
      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
        className="bg-white px-5 pb-safe-offset-4 pt-3 shadow-sm shadow-black/5"
      >
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
        fullAddress={`${line1}\n${addressLabel}\nLandmark: ${landmark.trim()}`}
        recipientName={recipientName.trim()}
        recipientPhone={recipientPhone.trim()}
        instructions={deliveryInstructions}
        saving={saving}
        onEdit={() => setConfirmVisible(false)}
        onConfirm={handleConfirmSave}
      />
    </View>
  );
}
