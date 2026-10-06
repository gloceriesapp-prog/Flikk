// Per-replica capacity bound. IP caps allow shared mobile/NAT networks; the
// edge must additionally enforce global connection and reconnect budgets.
export class StreamAdmission {
  private total = 0;
  private byIp = new Map<string, number>();
  constructor(private readonly capacity: number, private readonly perIp: number) {}
  acquire(ip: string): (() => void) | null {
    const current = this.byIp.get(ip) ?? 0;
    if (this.total >= this.capacity || current >= this.perIp) return null;
    this.total++; this.byIp.set(ip, current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true; this.total--;
      const next = (this.byIp.get(ip) ?? 1) - 1;
      if (next) this.byIp.set(ip, next); else this.byIp.delete(ip);
    };
  }
  get size() { return this.total; }
}
export function streamLimit(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100000) throw new Error('Invalid SSE connection limit');
  return parsed;
}

export interface StreamWriter {
  destroyed: boolean;
  writableEnded: boolean;
  write(frame: string): boolean;
  destroy(): unknown;
}
// Never queue a second frame behind a slow stream. The transport closes and
// the client's jittered reconnect policy obtains a fresh inventory snapshot.
export function writeStreamFrame(stream: StreamWriter, frame: string): 'sent' | 'closed' | 'backpressure' | 'error' {
  if (stream.destroyed || stream.writableEnded) return 'closed';
  try {
    if (stream.write(frame)) return 'sent';
    stream.destroy(); return 'backpressure';
  } catch {
    stream.destroy(); return 'error';
  }
}
