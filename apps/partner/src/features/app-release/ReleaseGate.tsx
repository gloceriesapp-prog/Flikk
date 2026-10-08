// App version / maintenance gate (admin "App settings" > Partner app,
// migration 112; backend GET /app-config/release/partner, public so it works
// before sign-in, polled every minute):
//   - maintenance on: a full-screen message replaces the app;
//   - below the minimum (or below latest with force update): a blocking
//     "Update required" screen with the store link;
//   - below latest: a dismissible "Update available" notice.
// A pending or failed fetch never blocks the app.
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { parseRelease, releaseGate } from '@gloceries/shared';
import { apiRequest } from '../../api/client';

const APP_VERSION = Constants.expoConfig?.version ?? null;

function openStore(url: string) {
  Linking.openURL(url).catch(() => Alert.alert('Could not open the store', 'Please update the app from your app store.'));
}

function FullScreen({ title, message, storeUrl }: { title: string; message: string; storeUrl?: string | null }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text accessibilityRole="header" className="text-center text-2xl font-bold text-ink">{title}</Text>
      <Text className="mt-3 text-center text-base leading-6 text-ink/70">{message}</Text>
      {storeUrl ? (
        <Pressable accessibilityRole="button" onPress={() => openStore(storeUrl)} className="mt-8 min-h-12 justify-center rounded-2xl bg-ink px-8">
          <Text className="text-base font-bold text-white">Update now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ReleaseGate({ children }: { children: ReactNode }) {
  const { data: release = null } = useQuery({
    queryKey: ['app-release', 'partner'],
    queryFn: async () => parseRelease(await apiRequest<unknown>('/app-config/release/partner', { auth: false })),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const gate = releaseGate(release, APP_VERSION, Platform.OS);

  if (gate.kind === 'maintenance') return <FullScreen title="We’ll be right back" message={gate.message} />;
  if (gate.kind === 'update-required') {
    return <FullScreen title="Update required" message="This version of the store app is no longer supported. Update to keep receiving orders." storeUrl={gate.storeUrl} />;
  }
  return (
    <View className="flex-1">
      {children}
      {gate.kind === 'update-available' && dismissedVersion !== gate.latestVersion ? (
        <View pointerEvents="box-none" className="absolute inset-x-0 bottom-24 px-4">
          <View className="flex-row items-center gap-3 rounded-2xl bg-ink px-4 py-3">
            <Text className="flex-1 text-sm font-medium text-white">A new version of the store app is available.</Text>
            {gate.storeUrl ? (
              <Pressable accessibilityRole="button" onPress={() => openStore(gate.storeUrl!)} hitSlop={8}>
                <Text className="text-sm font-bold text-white">Update</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss update notice" onPress={() => setDismissedVersion(gate.latestVersion)} hitSlop={8}>
              <Text className="text-sm font-bold text-white/70">Later</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
