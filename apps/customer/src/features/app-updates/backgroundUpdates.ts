/** A download-only adapter: deliberately has no reload/install operation. */
export interface UpdateDownloadDriver {
  check(): Promise<{ isAvailable: boolean; isRollBackToEmbedded?: boolean }>;
  fetch(): Promise<unknown>;
}
export function createBackgroundUpdates(driver: UpdateDownloadDriver, now = Date.now) {
  let inFlight = false;
  let nextAttempt = 0;
  return async (canDownload: () => boolean): Promise<void> => {
    if (inFlight || !canDownload() || now() < nextAttempt) return;
    inFlight = true;
    nextAttempt = now() + 60_000;
    try {
      const result = await driver.check();
      // Native rollback directives also have to be downloaded for the next launch.
      if (result.isAvailable || result.isRollBackToEmbedded) {
        if (!canDownload()) { nextAttempt = 0; return; }
        await driver.fetch();
      }
      nextAttempt = now() + 4 * 60 * 60_000;
    } catch {
      // Offline, timeout and unsupported development clients must never block the app.
      // A later foreground/network event may retry after the short failure cooldown.
    } finally { inFlight = false; }
  };
}
