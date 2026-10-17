import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UpdatePhase } from './updateController';
import { UpdateProgressBar } from './UpdateProgressBar';

interface Props {
  phase: UpdatePhase;
  progress?: number;
  onRetry(): void;
  onReload(): void;
  preview?: boolean;
}

export function AppUpdateSheet({ phase, progress, onRetry, onReload, preview = false }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const failed = phase === 'download-error' || phase === 'reload-error';
  const ready = phase === 'ready' || phase === 'reload-error';
  const restarting = phase === 'reloading';
  const percent = progress === undefined ? null : Math.floor(progress * 100);
  const message = phase === 'download-error'
    ? 'The download was interrupted. Check your connection and try again.'
    : phase === 'reload-error'
      ? 'Your update is saved. Tap Reload App to try restarting again.'
      : ready
        ? 'The latest improvements are downloaded. Reload the app to enjoy them.'
        : restarting
          ? 'Opening the latest version. You’ll be back in a moment.'
          : 'We’re downloading the latest improvements. Keep the app open, we’ll let you know when it’s ready.';
  const status = phase === 'download-error' ? 'Download interrupted'
    : phase === 'reload-error' ? 'Ready to reload'
      : restarting ? 'Restarting…'
        : ready ? 'Download complete'
          : percent !== null && percent >= 99 ? 'Finishing download…' : 'Downloading update…';
  return (
    <Modal visible={phase !== 'idle'} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent
      presentationStyle="overFullScreen" onRequestClose={() => {}}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' }}>
        <View accessibilityViewIsModal style={{ maxHeight: height * 0.85, width: '100%', maxWidth: 640, alignSelf: 'center',
          backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
          <ScrollView bounces={false} style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28 }}>
            {preview && <Text className="mb-3 text-[12px] font-medium text-black/45">UI preview</Text>}
            <Text accessibilityRole="header" className="text-[23px] font-bold text-black">Your app, made better</Text>
            <Text accessibilityLiveRegion="polite" className="mt-3 text-[15px] font-medium leading-6 text-black/65">{message}</Text>
            <UpdateProgressBar progress={progress} active={phase === 'downloading'} />
            <View className="mt-3 flex-row items-center justify-between gap-3">
              <Text accessibilityLiveRegion="polite" className="flex-1 text-[13px] font-medium text-black/55">{status}</Text>
              {percent !== null && <Text className="text-[14px] font-semibold text-black">{percent}%</Text>}
            </View>
          </ScrollView>
          <View style={{ flexShrink: 0, paddingHorizontal: 24, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready && !failed, busy: restarting }}
              disabled={!ready && !failed} onPress={ready ? onReload : onRetry}
              style={{ minHeight: 56, justifyContent: 'center', alignItems: 'center',
                borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
                backgroundColor: '#111111' }}>
              <Text style={{ opacity: ready || failed ? 1 : 0.65 }} className="text-[17px] font-semibold text-white">
                {ready ? 'Reload App' : failed ? 'Retry download' : restarting ? 'Reloading…' : 'Downloading update…'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
