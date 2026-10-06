// Transport-independent policy, tested with fake time. No polling while the
// database stream is healthy; failures and catch-up are spread across devices.
export class ConnectionPolicy {
  private fallback: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private reconnect: ReturnType<typeof setTimeout> | null = null;
  private catchUp: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private healthy = false;
  private running = false;
  constructor(private refresh: () => void, private connect: () => void, private random = Math.random) {}
  start() { this.running = true; this.scheduleFallback(); this.connect(); }
  private scheduleFallback() {
    if (!this.running || this.healthy || this.fallback) return;
    this.fallback = setTimeout(() => {
      this.fallback = null;
      if (!this.running || this.healthy) return;
      this.refresh(); this.scheduleFallback();
    }, 45_000 + this.random() * 30_000);
  }
  pulse(healthy: boolean, recovery = false) {
    if (!this.running) return;
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => this.failed(), 60_000);
    const wasHealthy = this.healthy;
    this.healthy = healthy;
    if (healthy) {
      this.attempts = 0;
      if (this.reconnect) clearTimeout(this.reconnect);
      this.reconnect = null;
      if (this.fallback) clearTimeout(this.fallback);
      this.fallback = null;
      if ((!wasHealthy || recovery) && !this.catchUp) this.catchUp = setTimeout(() => {
        this.catchUp = null; if (this.running && this.healthy) this.refresh();
      }, 1000 + this.random() * 4000);
    } else this.scheduleFallback();
  }
  failed() {
    if (!this.running) return;
    this.healthy = false;
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    this.scheduleFallback();
    if (this.reconnect) return;
    const ceiling = Math.min(60_000, 2000 * 2 ** Math.min(this.attempts++, 5));
    this.reconnect = setTimeout(() => {
      this.reconnect = null; if (this.running) this.connect();
    }, ceiling * (0.5 + this.random() * 0.5));
  }
  stop() {
    this.running = false; this.healthy = false; this.attempts = 0;
    for (const timer of [this.fallback, this.watchdog, this.reconnect, this.catchUp]) if (timer) clearTimeout(timer);
    this.fallback = this.watchdog = this.reconnect = this.catchUp = null;
  }
}
