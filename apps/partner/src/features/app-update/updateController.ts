export type UpdatePhase = 'idle' | 'downloading' | 'ready' | 'download-error' | 'reloading' | 'reload-error';
type UpdateResult = { isAvailable?: boolean; isNew?: boolean; isRollBackToEmbedded?: boolean };
interface UpdateClient {
  check(): Promise<UpdateResult>;
  download(): Promise<UpdateResult>;
  reload(): Promise<void>;
  now(): number;
}

// One coordinator for the entire app, independent of auth/navigation remounts.
// Failed discovery stays non-blocking; once an update is found, only retry or
// installing it can close the gate. Native download state survives JS reloads.
export function createUpdateController(client: UpdateClient) {
  let phase: UpdatePhase = 'idle';
  let lastCheck = -Infinity;
  let checking: Promise<void> | undefined;
  let downloading: Promise<void> | undefined;
  let restarting: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  function setPhase(next: UpdatePhase) {
    if (next === phase) return;
    phase = next;
    listeners.forEach(listener => listener());
  }
  function download(): Promise<void> {
    if (downloading) return downloading;
    if (phase === 'ready' || phase === 'reloading' || phase === 'reload-error') return Promise.resolve();
    setPhase('downloading');
    downloading = Promise.resolve().then(async () => {
      try {
        const result = await client.download();
        if (phase === 'reloading' || phase === 'reload-error') return;
        // A native startup download may finish while this request is in flight.
        // Its confirmed ready state wins over a late no-op response or failure.
        if (result.isNew || result.isRollBackToEmbedded) setPhase('ready');
        else if (phase !== 'ready') setPhase('idle');
      } catch {
        if (phase !== 'ready' && phase !== 'reloading' && phase !== 'reload-error') setPhase('download-error');
      } finally {
        downloading = undefined;
      }
    });
    return downloading;
  }
  function check(): Promise<void> {
    if (checking) return checking;
    if (phase !== 'idle' || client.now() - lastCheck < 60_000) return Promise.resolve();
    lastCheck = client.now();
    checking = Promise.resolve().then(async () => {
      try {
        const result = await client.check();
        if (result.isAvailable || result.isRollBackToEmbedded) await download();
      } catch {
        // Offline startup must not lock an otherwise usable app.
      } finally {
        checking = undefined;
      }
    });
    return checking;
  }
  function reload(): Promise<void> {
    if (restarting) return restarting;
    if (phase !== 'ready' && phase !== 'reload-error') return Promise.resolve();
    setPhase('reloading');
    restarting = Promise.resolve().then(async () => {
      try {
        await client.reload();
      } catch {
        setPhase('reload-error');
      } finally {
        restarting = undefined;
      }
    });
    return restarting;
  }
  return {
    getSnapshot: () => phase,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    check,
    download,
    reload,
    observeNative(state: { pending: boolean; downloading: boolean; available: boolean; downloadError?: Error }) {
      if (phase === 'reloading' || phase === 'reload-error') return;
      if (state.pending) setPhase('ready');
      else if (state.downloading && phase === 'idle') setPhase('downloading');
      else if (state.downloadError && !downloading && phase === 'downloading') setPhase('download-error');
      else if (state.available && phase === 'idle') void download();
    },
  };
}
