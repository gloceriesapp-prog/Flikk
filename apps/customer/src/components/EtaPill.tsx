// Delivery time is the brand: one small "⚡ 35 mins" label, shared by product
// cards (minutes passed in by the section, no per-card query) and the top of
// browse screens (reads the shared delivery-settings cache itself).

import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useDeliveryEstimateMinutes } from '../api/deliverySettings';
import { useIsOutsideOperatingHours } from '../utils/useOperatingHours';

// Same blue as the cart bar.
const BLUE = '#155DFC';

function FlashIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" fill={BLUE}
        d="M19.9152 10.1047C19.6582 9.60268 19.1482 9.29068 18.5842 9.29068H13.6062V4.00068C13.6062 3.33768 13.2002 2.77668 12.5722 2.57268C11.9412 2.36768 11.2902 2.58268 10.9022 3.11668H10.9012L4.20622 12.3367C3.87422 12.7957 3.82822 13.3927 4.08522 13.8967C4.34222 14.3977 4.85222 14.7097 5.41622 14.7097H10.3932V20.0007C10.3932 20.6627 10.7992 21.2227 11.4272 21.4267C11.5852 21.4787 11.7452 21.5037 11.9022 21.5037C12.3682 21.5037 12.8092 21.2837 13.0992 20.8837L19.7942 11.6637C20.1262 11.2047 20.1722 10.6077 19.9152 10.1047Z" />
    </Svg>
  );
}

export function EtaPill({ minutes, size = 'card' }: { minutes: number; size?: 'card' | 'header' }) {
  const header = size === 'header';
  return (
    <View accessible accessibilityLabel={`Delivery in ${minutes} minutes`} className="flex-row items-center self-start">
      <FlashIcon size={header ? 13 : 11} />
      <Text className={`font-bold uppercase text-ink/60 ${header ? 'text-[11px] leading-[13px]' : 'text-[9px] leading-[11px]'}`}>{minutes} mins</Text>
    </View>
  );
}

// For screen headers: hidden while ordering is closed (no false promise).
export function HeaderEtaPill() {
  const minutes = useDeliveryEstimateMinutes();
  const closed = useIsOutsideOperatingHours();
  return closed ? null : <EtaPill minutes={minutes} size="header" />;
}
