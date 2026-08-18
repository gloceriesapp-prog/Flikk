// Collapsed: same rounded row pattern as DeliveryAddressCard, right chevron.
// Tapping the chevron expands the card into an option list (GPay/PhonePe/
// UPI/COD) and swaps the chevron for a close (X) icon; tapping that closes
// it again. No payment method is pre-selected — the row shows a neutral
// "Select payment method" prompt and every option's radio dot starts empty
// until the user picks one (Amazon/Meesho/Blinkit checkout convention).
// Dragging down on the expanded panel's handle also collapses it, same as
// a bottom sheet.
//
// Real brand marks for every option except COD — Simple Icons' CDN (SVG,
// same set most of these apps' own web checkouts pull from) for Google Pay
// and PhonePe; UPI has no single official glyph there, so it keeps a
// generic card icon. No real payment gateway wired up yet, same caveat as
// everywhere else in this app that touches money — see CartScreen.tsx's
// own note on the placeholder checkout flow.

import { useState } from 'react';
import { Cancel01Icon, ArrowRight01Icon, BanknoteIcon, CreditCardIcon } from '@hugeicons/core-free-icons';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export type PaymentMethod = 'gpay' | 'phonepe' | 'upi' | 'cod';

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  // Real brand mark (SVG URI) when one exists; falls back to `icon` (a
  // generic HugeIcons glyph) otherwise — see file header.
  logoUri?: string;
  icon: IconSvgElement;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'gpay', label: 'Google Pay', logoUri: 'https://cdn.simpleicons.org/googlepay', icon: CreditCardIcon },
  { id: 'phonepe', label: 'PhonePe', logoUri: 'https://cdn.simpleicons.org/phonepe', icon: CreditCardIcon },
  { id: 'upi', label: 'UPI', icon: CreditCardIcon },
  { id: 'cod', label: 'Cash on Delivery', icon: BanknoteIcon },
];

// Exported so CheckoutFooter can build "Pay with Google Pay" without a
// second copy of these labels.
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  gpay: 'Google Pay',
  phonepe: 'PhonePe',
  upi: 'UPI',
  cod: 'Cash on Delivery',
};

// How far down the handle needs to be dragged before it counts as
// "dismiss," not an accidental nudge.
const DRAG_TO_CLOSE_THRESHOLD = 30;

function PaymentOptionMark({ option }: { option: PaymentOption }) {
  if (option.logoUri) return <SvgUri uri={option.logoUri} width={20} height={20} />;
  return <AppIcon icon={option.icon} size={18} color={colors.ink} />;
}

function RadioDot({ selected }: { selected: boolean }) {
  if (!selected) return <View className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  return (
    <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-lime-deep bg-lime-deep">
      <View className="h-2 w-2 rounded-full bg-white" />
    </View>
  );
}

interface Props {
  method: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethodCard({ method, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selectedOption = PAYMENT_OPTIONS.find((o) => o.id === method);

  // Lazy useState initializer, not useRef — reading ref.current during
  // render is unsafe per the react-hooks/refs lint rule; PanResponder.create
  // only needs to run once, which useState's initializer already guarantees.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DRAG_TO_CLOSE_THRESHOLD) setExpanded(false);
      },
    })
  );

  return (
    <View className="overflow-hidden rounded-2xl bg-gray-100">
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center gap-3 px-4 py-3.5"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
          {selectedOption ? <PaymentOptionMark option={selectedOption} /> : <AppIcon icon={CreditCardIcon} size={17} color={colors.ink} />}
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink/50">Payment method</Text>
          <Text className="text-base font-semibold text-ink">
            {method ? PAYMENT_METHOD_LABEL[method] : 'Select payment method'}
          </Text>
        </View>
        <AppIcon icon={expanded ? Cancel01Icon : ArrowRight01Icon} size={18} color={colors.ink} />
      </Pressable>

      {expanded && (
        <View {...panResponder.panHandlers}>
          {/* Drag handle — visual affordance for the swipe-down-to-close
              gesture attached to this whole panel via panResponder. */}
          <View className="items-center pb-2">
            <View className="h-1 w-10 rounded-full bg-black/15" />
          </View>

          <View className="gap-1 px-3 pb-3">
            {PAYMENT_OPTIONS.map((option) => {
              const isSelected = option.id === method;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    onSelect(option.id);
                    setExpanded(false);
                  }}
                  className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${
                    isSelected ? 'border border-lime-deep bg-lime-soft' : 'bg-white'
                  }`}
                >
                  <PaymentOptionMark option={option} />
                  <Text className={`flex-1 text-sm ${isSelected ? 'font-bold text-ink' : 'font-semibold text-ink/80'}`}>
                    {option.label}
                  </Text>
                  <RadioDot selected={isSelected} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
