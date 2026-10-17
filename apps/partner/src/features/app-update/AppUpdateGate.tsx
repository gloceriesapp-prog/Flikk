import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { AppUpdateSheet } from './AppUpdateSheet';
import { useAppUpdate } from './useAppUpdate';
import { AppUpdatePreview } from './AppUpdatePreview';

function EnabledUpdateGate({ children }: { children: ReactNode }) {
  const update = useAppUpdate();
  return (
    <>
      {children}
      <AppUpdateSheet phase={update.phase} progress={update.progress}
        onRetry={() => { void update.retry(); }} onReload={() => { void update.reload(); }} />
    </>
  );
}

export function AppUpdateGate({ children }: { children: ReactNode }) {
  if (__DEV__ && process.env.EXPO_PUBLIC_UPDATE_UI_PREVIEW === 'true') return <AppUpdatePreview>{children}</AppUpdatePreview>;
  // Expo Go and Metro development sessions cannot fetch/reload OTA updates.
  if (__DEV__ || !Updates.isEnabled || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return <>{children}</>;
  return <EnabledUpdateGate>{children}</EnabledUpdateGate>;
}
