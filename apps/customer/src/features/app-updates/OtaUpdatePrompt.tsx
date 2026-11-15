import { useState } from 'react';
import * as Updates from 'expo-updates';
import { UpdateSheet } from './UpdateSheet';

type Phase = { kind: 'downloading'; progress: number } | { kind: 'ready' } | { kind: 'idle' };
interface Prompt { phase: Phase; restart: () => Promise<void> }

// useBackgroundUpdates starts every download (checkAutomatically is
// ON_ERROR_RECOVERY, so nothing else does); this only mirrors native state.
// A failed download clears isDownloading, so the card simply disappears.
// The ready card has no dismiss: the app never restarts on its own, and a
// cold start applies the downloaded update anyway.
function useOtaPrompt(): Prompt {
  const { isDownloading, downloadProgress, isUpdatePending } = Updates.useUpdates();
  const phase: Phase = isUpdatePending ? { kind: 'ready' }
    : isDownloading ? { kind: 'downloading', progress: downloadProgress ?? 0 }
      : { kind: 'idle' };
  // Restarts the app on the downloaded update.
  return { phase, restart: () => Updates.reloadAsync() };
}

const useIdlePrompt = (): Prompt => ({ phase: { kind: 'idle' }, restart: async () => {} });
// Development builds have no update channel. Chosen once per bundle, so hook
// order never changes between renders.
const usePrompt = __DEV__ ? useIdlePrompt : useOtaPrompt;

export function OtaUpdatePrompt() {
  const { phase, restart } = usePrompt();
  const [restarting, setRestarting] = useState(false);

  if (phase.kind === 'idle') return null;
  if (phase.kind === 'downloading') {
    return <UpdateSheet title="Downloading update" message="You can keep shopping while it finishes." progress={phase.progress} />;
  }
  return (
    <UpdateSheet
      title="Update ready"
      message="Restart Gloceries to finish updating. Your cart and address are saved."
      primary={{
        label: 'Restart now', busy: restarting,
        onPress: () => {
          setRestarting(true);
          // On failure the update stays downloaded and applies on the next cold start.
          restart().catch(() => {}).finally(() => setRestarting(false));
        },
      }}
    />
  );
}
