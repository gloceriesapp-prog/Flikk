import type { ReactNode } from 'react';
import { View } from 'react-native';

// Address selection lives at the top of checkout; only payment stays pinned.
export function CartCheckoutFooter({ paymentBar }: { paymentBar: ReactNode }) {
  return <View className="border-t border-mist bg-white">{paymentBar}</View>;
}
