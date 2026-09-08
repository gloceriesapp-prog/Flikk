// Digit-only time entry for Store hours — a shop owner types just the
// digits ("900" for 9:00) and this formats them live as "9:00", with a
// fixed AM/PM suffix pinned inside the box's right edge (AM for Opens, PM
// for Closes — a kirana store's schedule is always "morning open, evening
// close", not a toggle a shop owner needs to flip). The saved value
// (openTime/closeTime on StoreProfile) is the full "9:00 AM" string, same
// shape that field always held — this component just constrains how it's
// typed, not what's stored.
//
// keyboardType="number-pad" gets the OS number pad, but doesn't stop a
// hardware keyboard or paste from injecting non-digits — the onChangeText
// handler strips everything but digits itself as the real guarantee.

import { Text, TextInput, View } from 'react-native';

// Max 4 digits: HHMM (e.g. "1230" -> "12:30"). A 5th digit would make an
// impossible hour (no store opens at "123:0"), so typing stops there.
const MAX_DIGITS = 4;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

// "9" -> "9", "93" -> "93" (still typing the hour, no colon yet — could
// still become "9:30" or a two-digit hour like "23"), "930" -> "9:30",
// "1230" -> "12:30". A colon only appears once there are enough digits
// left over to actually be minutes (3+ digits: 1 digit hour + 2 minutes,
// or 4 digits: 2 digit hour + 2 minutes).
function formatDigits(digits: string): string {
  if (digits.length <= 2) return digits;
  const minutes = digits.slice(-2);
  const hours = digits.slice(0, -2);
  return `${hours}:${minutes}`;
}

// Reverse of the above — pulls just the digits back out of a stored
// "9:00 AM"/"9:00 PM" string so the input can re-derive what to display
// (and re-edit) without carrying the suffix as part of the editable text.
function extractDigits(storedValue: string): string {
  return digitsOnly(storedValue);
}

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  suffix: 'AM' | 'PM';
}

export function TimeDigitsInput({ value, onChangeText, suffix }: Props) {
  const digits = extractDigits(value);

  function handleChange(raw: string) {
    const nextDigits = digitsOnly(raw);
    onChangeText(nextDigits.length > 0 ? `${formatDigits(nextDigits)} ${suffix}` : '');
  }

  return (
    <View className="relative justify-center">
      <TextInput
        value={formatDigits(digits)}
        onChangeText={handleChange}
        keyboardType="number-pad"
        placeholder={suffix === 'AM' ? '9:00' : '9:00'}
        placeholderTextColor="#9AA5A3"
        className="rounded-2xl border border-black/10 bg-white py-3 pl-4 pr-12 text-[15px] font-semibold text-ink"
      />
      <Text className="absolute right-4 text-[13px] font-bold text-ink/40">{suffix}</Text>
    </View>
  );
}
