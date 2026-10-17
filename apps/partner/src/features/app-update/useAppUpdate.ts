import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { createUpdateController } from './updateController';

const controller = createUpdateController({
  check: Updates.checkForUpdateAsync,
  download: Updates.fetchUpdateAsync,
  reload: () => Updates.reloadAsync(),
  now: Date.now,
});

export function useAppUpdate() {
  const native = Updates.useUpdates();
  const phase = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    controller.observeNative({
      pending: native.isUpdatePending,
      downloading: native.isDownloading,
      available: native.isUpdateAvailable,
      downloadError: native.downloadError,
    });
  }, [native.isUpdatePending, native.isDownloading, native.isUpdateAvailable, native.downloadError]);

  useEffect(() => {
    if (native.isStartupProcedureRunning) return;
    void controller.check();
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') void controller.check();
      previous = next;
    });
    return () => subscription.remove();
  }, [native.isStartupProcedureRunning]);

  const complete = phase === 'ready' || phase === 'reloading' || phase === 'reload-error';
  const rawProgress = native.downloadProgress;
  const progress = complete ? 1 : typeof rawProgress === 'number' && Number.isFinite(rawProgress)
    ? Math.min(0.99, Math.max(0, rawProgress)) : undefined;
  return { phase, progress, retry: controller.download, reload: controller.reload };
}
