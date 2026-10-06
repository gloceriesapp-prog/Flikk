import { AppImage as Image } from '../../components/AppImage';
// The one screen shown on every cold app open, always, before Home or
// Login — same real pattern as apps/customer's own screens/WelcomeScreen.tsx
// + RootNavigator.tsx: rendered directly by RootNavigator for a fixed
// duration (not part of either the Auth or App stack, no navigation prop,
// nothing tappable), then routed to AppNavigator (a real session already
// exists) or AuthNavigator's Login (no session — the real phone-entry
// screen, no separate "Get Started" splash first anymore, per an explicit
// ask to drop that tappable step). RootNavigator's own timer is what
// moves it along, never a button here.
//
// Solid blue (#155dfc) — same exact accent apps/customer's own checkout
// flow already established as this brand's one real accent color
// (PaymentMethodList.tsx, PaymentProcessingScreen.tsx, PaymentStatusScreen.
// tsx's own BRAND_ACCENT) — kept consistent across apps rather than
// inventing a second blue.

import { Text, View } from 'react-native';

const BRAND_BLUE = '#155dfc';
const LOGO_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/brand-preview.png';

export function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: BRAND_BLUE }}>
      {/* A soft lighter-blue disc behind the mark, not a flat block —
          gives the hero real depth instead of reading as a plain color
          fill, without needing a second image asset for the backdrop. */}
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-[28px]" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
        <Image source={{ uri: LOGO_URL }} className="h-16 w-16" resizeMode="contain" />
      </View>
      <Text className="text-[30px] font-semibold tracking-tight text-white">Gloceries Partner</Text>
      <Text className="mt-2 max-w-[280px] text-center text-[15.5px] font-medium leading-5 text-white/75">
        Manage orders, catalog, and payouts for your store, all in one place.
      </Text>
    </View>
  );
}
