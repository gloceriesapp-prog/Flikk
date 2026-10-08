// App version / maintenance gate (admin "App settings", migration 112;
// backend GET /app-config/release/customer, polled every minute):
//   - maintenance on: a full-screen message replaces the app;
//   - below the minimum (or below latest with force update): a blocking
//     "Update required" screen with the store link;
//   - below latest: a dismissible "Update available" notice over the app.
// Never blocks on a failed or pending fetch (useAppRelease returns null).
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { releaseGate } from '@gloceries/shared';
import { useAppRelease } from '../../api/appConfig';
import { openLink } from '../../utils/openLink';

export const APP_VERSION = Constants.expoConfig?.version ?? null;

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
  if (gate.kind === 'update-required') {
    return (
      <FullScreen
        title="Update required"
        message="This version of Gloceries is no longer supported. Update the app to keep ordering."
        action={gate.storeUrl ? { label: 'Update now', onPress: () => openLink(gate.storeUrl!) } : undefined}
      />
    );
  }
  return (
    <View className="flex-1">
      {children}
      {gate.kind === 'update-available' && dismissedVersion !== gate.latestVersion && (
        <View pointerEvents="box-none" className="absolute inset-x-0 bottom-28 px-4">
          <View className="flex-row items-center gap-3 rounded-2xl bg-ink px-4 py-3">
            <Text className="flex-1 text-sm font-medium text-white">A new version of Gloceries is available.</Text>
            {gate.storeUrl && (
              <Pressable accessibilityRole="button" onPress={() => openLink(gate.storeUrl!)} hitSlop={8}>
                <Text className="text-sm font-bold text-[#8FB6FF]">Update</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss update notice" onPress={() => setDismissedVersion(gate.latestVersion)} hitSlop={8}>
              <Text className="text-sm font-bold text-white/70">Later</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
