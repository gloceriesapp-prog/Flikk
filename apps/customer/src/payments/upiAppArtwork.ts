import type { ImageSourcePropType } from 'react-native';

// Official App Store artwork is bundled for iOS, where installed-app discovery
// returns URL support but cannot read another application's icon. Provenance:
// assets/payment/upi/sources.json. Android still prefers the installed icon.
export const UPI_APP_ARTWORK: Record<string, ImageSourcePropType> = {
  gpay: require('../../assets/payment/upi/gpay.jpg'),
  phonepe: require('../../assets/payment/upi/phonepe.jpg'),
  paytm: require('../../assets/payment/upi/paytm.jpg'),
  bhim: require('../../assets/payment/upi/bhim.jpg'),
  cred: require('../../assets/payment/upi/cred.jpg'),
  amazonpay: require('../../assets/payment/upi/amazonpay.jpg'),
  whatsapp: require('../../assets/payment/upi/whatsapp.jpg'),
};
