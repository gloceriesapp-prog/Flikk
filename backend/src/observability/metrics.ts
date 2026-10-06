type Labels = Record<string, string>;
interface Sample { labels: Labels; value: number; count: number; buckets: number[] }
const BOUNDS = [0.005, 0.025, 0.1, 0.25, 0.5, 1, 2, 5, 15];
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
export class Metrics {
  private families = new Map<string, { type: 'counter' | 'gauge' | 'histogram'; samples: Map<string, Sample> }>();
  private series = 0;
  private dropped = 0;
  private sample(name: string, type: 'counter' | 'gauge' | 'histogram', labels: Labels) {
    if (!/^flikk_[a-z0-9_]+$/.test(name)) throw new Error('Invalid metric name');
    const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    if (entries.some(([key, value]) => !/^[a-z_]+$/.test(key) || value.length > 160)) throw new Error('Invalid metric labels');
    const key = JSON.stringify(entries);
    let family = this.families.get(name);
    if (!family) {
      if (this.families.size >= 80) { this.dropped++; return; }
      family = { type, samples: new Map() }; this.families.set(name, family);
    }
    if (family.type !== type) throw new Error('Metric type changed');
    let sample = family.samples.get(key);
    if (!sample) {
      if (this.series >= 4096) { this.dropped++; return; }
      sample = { labels: Object.fromEntries(entries), value: 0, count: 0, buckets: BOUNDS.map(() => 0) };
      family.samples.set(key, sample); this.series++;
    }
    return sample;
  }
  increment(name: string, labels: Labels = {}, value = 1) {
    if (!Number.isFinite(value) || value < 0) return;
    const sample = this.sample(name, 'counter', labels); if (sample) sample.value += value;
  }
  gauge(name: string, value: number, labels: Labels = {}) {
    if (!Number.isFinite(value)) return;
    const sample = this.sample(name, 'gauge', labels); if (sample) sample.value = value;
  }
  observe(name: string, seconds: number, labels: Labels = {}) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const sample = this.sample(name, 'histogram', labels);
    if (sample) { sample.value += seconds; sample.count++; BOUNDS.forEach((bound, i) => { if (seconds <= bound) sample.buckets[i]!++; }); }
  }
  render() {
    const lines = ['# TYPE flikk_metric_series_dropped_total counter', `flikk_metric_series_dropped_total ${this.dropped}`];
    const format = (labels: Labels) => Object.keys(labels).length ? `{${Object.entries(labels).map(([key,value]) => `${key}="${escape(value)}"`).join(',')}}` : '';
    for (const [name, family] of this.families) {
      lines.push(`# TYPE ${name} ${family.type}`);
      for (const sample of family.samples.values()) {
        if (family.type === 'histogram') {
          BOUNDS.forEach((bound, i) => lines.push(`${name}_bucket${format({...sample.labels, le:String(bound)})} ${sample.buckets[i]}`));
          lines.push(`${name}_bucket${format({...sample.labels, le:'+Inf'})} ${sample.count}`);
          lines.push(`${name}_sum${format(sample.labels)} ${sample.value}`, `${name}_count${format(sample.labels)} ${sample.count}`);
        } else lines.push(`${name}${format(sample.labels)} ${sample.value}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }
}
export const metrics = new Metrics();
