// Order completion — a real health signal, not a stand-in: delivered ÷
// every order that reached a terminal outcome (see
// PLACEHOLDER_PRODUCT_PERFORMANCE's own note in lib/mock-data.ts on how
// it's derived). Red/amber/green earns its meaning here — under 30%
// completion is a real problem, over 70% is real health, unlike a 3-state
// enum forced onto a continuous gauge. Colors pull from globals.css's own
// semantic tokens. Plain SVG (no chart lib) since the shape is fixed math
// — no client boundary needed.

const CENTER_X = 120;
const CENTER_Y = 118;
const BAND_RADIUS = 92;
const BAND_WIDTH = 22;
const NEEDLE_RADIUS = 76;

// Value 0 sits at 180° (left), value 100 sits at 0° (right), sweeping
// through 90° (top) — standard semicircle gauge convention.
function angleForValue(value: number): number {
  return 180 - (value / 100) * 180;
}

function pointOnArc(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER_X + radius * Math.cos(rad), y: CENTER_Y - radius * Math.sin(rad) };
}

function bandPath(fromValue: number, toValue: number): string {
  const start = pointOnArc(BAND_RADIUS, angleForValue(fromValue));
  const end = pointOnArc(BAND_RADIUS, angleForValue(toValue));
  return `M ${start.x} ${start.y} A ${BAND_RADIUS} ${BAND_RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

const BANDS = [
  { from: 0, to: 30, color: 'var(--color-danger)' },
  { from: 30, to: 70, color: 'var(--color-warning)' },
  { from: 70, to: 100, color: 'var(--color-success)' },
];

const TICKS = [0, 25, 50, 75, 100];

export function CompletionGauge({ completionRate }: { completionRate: number }) {
  const value = Math.min(Math.max(completionRate, 0), 100);
  const needleTip = pointOnArc(NEEDLE_RADIUS, angleForValue(value));

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 240 130" className="w-full">
        {BANDS.map((band) => (
          <path key={band.color} d={bandPath(band.from, band.to)} stroke={band.color} strokeWidth={BAND_WIDTH} strokeLinecap="round" fill="none" />
        ))}

        {TICKS.map((tick) => {
          const outer = pointOnArc(BAND_RADIUS + BAND_WIDTH / 2 + 8, angleForValue(tick));
          return (
            <text key={tick} x={outer.x} y={outer.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted text-[9px] font-medium">
              {tick}
            </text>
          );
        })}

        <line x1={CENTER_X} y1={CENTER_Y} x2={needleTip.x} y2={needleTip.y} stroke="var(--color-ink)" strokeWidth={4} strokeLinecap="round" />
        <circle cx={CENTER_X} cy={CENTER_Y} r={7} fill="var(--color-ink)" />
      </svg>

      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums text-ink">{Math.round(value)}%</span>
        <span className="text-xs font-medium text-muted">of orders completed</span>
      </div>
    </div>
  );
}
