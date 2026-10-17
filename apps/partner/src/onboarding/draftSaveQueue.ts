// Background-only draft writes. A slow save cannot block navigation or let
// an older response overwrite a newer edit from the same onboarding session.
export function createDraftSaveQueue<P extends object>(deps: {
  epoch: () => number;
  save: (patch: P) => Promise<void>;
  onError: (error: unknown) => void;
  delayMs?: number;
}) {
  let pending: P | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active: { epoch: number; promise: Promise<void> } | null = null;
  let epoch = deps.epoch();
  function reset() {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    active = null;
    epoch = deps.epoch();
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; start(); }, deps.delayMs ?? 350);
  }
  function start() {
    if (epoch !== deps.epoch()) { reset(); return; }
    if (active || !pending) return;
    const patch = pending;
    pending = null;
    const flight = { epoch, promise: Promise.resolve() };
    active = flight;
    flight.promise = Promise.resolve().then(() => {
      if (flight.epoch === deps.epoch()) return deps.save(patch);
    }).catch(error => {
      if (flight.epoch === deps.epoch()) deps.onError(error);
    }).finally(() => {
      if (active !== flight) return;
      active = null;
      if (pending) schedule();
    });
  }
  return {
    enqueue(patch: P) {
      if (epoch !== deps.epoch()) reset();
      pending = { ...pending, ...patch };
      schedule();
    },
    reset,
    async flush() {
      const captured = deps.epoch();
      while (captured === deps.epoch() && (pending || active)) {
        if (timer) clearTimeout(timer);
        timer = null;
        start();
        if (active) await active.promise;
      }
    },
  };
}
