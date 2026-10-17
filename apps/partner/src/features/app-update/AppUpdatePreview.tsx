import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppUpdateSheet } from './AppUpdateSheet';

// Opt-in Metro preview only. The real OTA APIs are unavailable in debug builds.
export function AppUpdatePreview({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const complete = progress >= 1;
  useEffect(() => {
    if (!visible || complete) return;
    // Explicit development-only animation demo; real progress comes from Expo.
    const timer = setInterval(() => setProgress(value => Math.min(1, value + 0.02)), 400);
    return () => clearInterval(timer);
  }, [visible, complete]);
  return <>
    {children}
    {!visible && <View className="absolute inset-x-5 bottom-16">
      <Pressable accessibilityRole="button" onPress={() => { setProgress(0); setVisible(true); }} className="rounded-2xl bg-black p-4">
        <Text className="text-center text-[15px] font-semibold text-white">Preview update sheet</Text>
      </Pressable>
    </View>}
    <AppUpdateSheet phase={!visible ? 'idle' : progress >= 1 ? 'ready' : 'downloading'} progress={progress} preview
      onRetry={() => setProgress(0)} onReload={() => setVisible(false)} />
  </>;
}
