import { useSyncExternalStore } from 'react';
import { AppState, Text } from 'react-native';

// The line under a product card's price. With both a discount and a
// freshness tag (admin: "Today's Fresh", "Farm Fresh", …) it alternates
// between them every ROTATE_MS; with one, that one stays put.
// One shared timer drives every card (same pattern as utils/useBrowseClock),
// so all cards flip together and a long grid never runs a timer per card.
const ROTATE_MS = 3_000;
const listeners = new Set<() => void>();
let step = 0;
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      step += 1;
      listeners.forEach(notify => notify());
    }, ROTATE_MS);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); timer = undefined; }
  };
}
const noopSubscribe = () => () => {};
const getStep = () => step;

interface Props {
  discount?: string | number | null; // percentage, e.g. "13"
  freshnessTag?: string;
  onDark?: boolean;
}

export function PriceHighlight({ discount, freshnessTag, onDark = false }: Props) {
  const lines = [
    discount ? { text: `${discount}% OFF`, color: onDark ? '#8FE3B0' : '#00A650' } : null,
    freshnessTag ? { text: freshnessTag, color: onDark ? '#FCD34D' : '#B45309' } : null,
  ].filter((line): line is { text: string; color: string } => line !== null);
  const rotates = lines.length > 1;
  // Only cards with two lines join the shared timer.
  const current = useSyncExternalStore(rotates ? subscribe : noopSubscribe, getStep);
  if (!lines.length) return null;
  const line = lines[rotates ? current % lines.length : 0]!;
  const label = lines.map(item => item.text).join(', ');

  return (
    // Both lines share one fixed size (no auto-shrink, which sized them
    // differently) and swap instantly: a layout fade-in stayed invisible
    // inside some horizontal product rows. Screen readers get both lines
    // once instead of a changing announcement.
    <Text numberOfLines={1} accessibilityLabel={label}
      className="text-[12px] font-bold leading-[15px]" style={{ color: line.color }}>
      {line.text}
    </Text>
  );
}
