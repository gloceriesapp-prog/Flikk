// Known UPI apps for installed-app discovery only. The native checkout SDK
// handles the payment URI and app selection; these schemes never carry money.
export interface UpiApp {
  id: string;
  name: string;
  iconUri?: string;
  scheme: string;
  androidPackage: string;
  color: string;
}

export const UPI_APPS: UpiApp[] = [
  { id: 'gpay', name: 'Google Pay', scheme: 'tez', androidPackage: 'com.google.android.apps.nbu.paisa.user', color: '#4285F4' },
  { id: 'phonepe', name: 'PhonePe', scheme: 'phonepe', androidPackage: 'com.phonepe.app', color: '#5F259F' },
  { id: 'paytm', name: 'Paytm', scheme: 'paytmmp', androidPackage: 'net.one97.paytm', color: '#00BAF2' },
  { id: 'bhim', name: 'BHIM', scheme: 'bhim', androidPackage: 'in.org.npci.upiapp', color: '#00A651' },
  { id: 'cred', name: 'CRED', scheme: 'credpay', androidPackage: 'com.dreamplug.androidapp', color: '#1C1C1E' },
  { id: 'amazonpay', name: 'Amazon Pay', scheme: 'amazonpay', androidPackage: 'in.amazon.mShop.android.shopping', color: '#FF9900' },
  { id: 'whatsapp', name: 'WhatsApp', scheme: 'whatsapp', androidPackage: 'com.whatsapp', color: '#25D366' },
];
