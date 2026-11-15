// App version / maintenance gate (admin "App settings", migration 112;
// backend GET /app-config/release/customer, polled every minute):
//   - maintenance on: a full-screen message replaces the app;
//   - below the minimum (or below latest with force update): a blocking
//     "Update required" bottom card over a dimmed, untouchable app;
//   - below latest: a dismissible "New version available" bottom card;
//   - otherwise: OTA download progress, then a "Restart" card (OtaUpdatePrompt).
// Never blocks on a failed or pending fetch (useAppRelease returns null).
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { releaseGate } from '@gloceries/shared';
import { useAppRelease } from '../../api/appConfig';
import { openLink } from '../../utils/openLink';
import { OtaUpdatePrompt } from '../app-updates/OtaUpdatePrompt';
import { UpdateSheet } from '../app-updates/UpdateSheet';

export const APP_VERSION = Constants.expoConfig?.version ?? null;

// Admin may leave the store links empty. Android's Play listing follows from the
// package name; iOS needs the App Store link (with its numeric id) set in admin.
const ANDROID_PACKAGE = Constants.expoConfig?.android?.package;
function storeLink(adminUrl: string | null): string | null {
  if (adminUrl) return adminUrl;
  return Platform.OS === 'android' && ANDROID_PACKAGE ? `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}` : null;
}

function FullScreen({ title, message, action }: { title: string; message: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text accessibilityRole="header" className="text-center text-2xl font-bold text-ink">{title}</Text>
      <Text className="mt-3 text-center text-base leading-6 text-ink/70">{message}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={action.onPress} className="mt-8 min-h-12 justify-center rounded-2xl bg-[#155DFC] px-8">
          <Text className="text-base font-bold text-white">{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ReleaseGate({ children }: { children: ReactNode }) {
  const release = useAppRelease();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const gate = releaseGate(release, APP_VERSION, Platform.OS);

  if (gate.kind === 'maintenance') return <FullScreen title="We’ll be right back" message={gate.message} />;
  const storeUrl = gate.kind === 'update-required' || gate.kind === 'update-available' ? storeLink(gate.storeUrl) : null;
  if (gate.kind === 'update-required') {
    // Blocking: the dimmed layer takes every touch, and the card has no "Later".
    return (
      <View className="flex-1">
        {children}
        <View className="absolute inset-0 bg-black/45" />
        <UpdateSheet
          title="Update required"
          message="This version of Gloceries is no longer supported. Install the latest version to keep ordering."
          primary={storeUrl ? { label: 'Update now', onPress: () => openLink(storeUrl) } : undefined}
        />
      </View>
    );
  }
  const showStoreUpdate = gate.kind === 'update-available' && dismissedVersion !== gate.latestVersion;
  return (
    <View className="flex-1">
      {children}
      {showStoreUpdate ? (
        <UpdateSheet
          title="New version available"
          message={`Gloceries ${gate.latestVersion} is out with new features and fixes.`}
          secondary={{ label: 'Later', onPress: () => setDismissedVersion(gate.latestVersion) }}
          primary={storeUrl ? { label: 'Update now', onPress: () => openLink(storeUrl) } : undefined}
        />
      ) : <OtaUpdatePrompt />}
    </View>
  );
}
