// "Today on Gloceries" on Home: hero + up to 4 cards for this time of day.
// The server grid (backend/src/today-grid) wins; while it can't answer
// (not deployed yet, offline) the planned schedule shows instead
// (scheduleGrid). Skeleton while loading; nothing when admin switches the
// grid off.
import { useEffect, useMemo, useState } from 'react';
import { AppState, View } from 'react-native';
import { useCopyImage } from '../../../api/appConfig';
import type { GridCard } from './api';
import { trackAddToCart, trackTap } from './analytics';
import { TodayGridSkeleton } from './components/TodayGridSkeleton';
import { TodayGridView } from './components/TodayGridView';
import { scheduleGrid } from './scheduleGrid';
import { useCardTap } from './useCardTap';
import { useTodayGrid } from './useTodayGrid';

export const HEADER_IMAGE_KEY = 'home.todayGrid.headerImageUrl';
// Built-in header artwork until admin uploads one.
export const DEFAULT_HEADER_IMAGE = 'https://images.gloceries.com/appsui/Namma.png';

export function TodayGridSection() {
  const { data, isPending, isError } = useTodayGrid();
  const schedule = useScheduleGrid(isError);
  const headerImageUrl = useCopyImage(HEADER_IMAGE_KEY, DEFAULT_HEADER_IMAGE);
  const grid = isError ? schedule : data;
  const slot = grid?.slot ?? '';
  const heroId = grid?.hero?.id ?? '';
  const tap = useCardTap((card, _count) => trackAddToCart({ cardId: card.id, slot, position: -1, hero: heroId }));
  if (!grid) return isPending ? <View className="bg-white pt-3"><TodayGridSkeleton /></View> : null;
  if (!grid.enabled || !grid.hero) return null;
  const hero = grid.hero;
  const onTap = (card: GridCard, position: number) => {
    trackTap({ cardId: card.id, slot, position, hero: hero.id });
    void tap(card);
  };
  return <View className="bg-white pt-3"><TodayGridView grid={{ ...grid, hero }} headerImageUrl={headerImageUrl} onTap={onTap} /></View>;
}

// The schedule for now, re-worked out at the next slot edge and whenever the
// app comes back to the foreground. Idle while the server grid answers.
function useScheduleGrid(active: boolean) {
  const [now, setNow] = useState(() => new Date());
  const grid = useMemo(() => (active ? scheduleGrid(now) : null), [active, now]);
  const refreshAt = grid?.refreshAt;
  useEffect(() => {
    if (!refreshAt) return;
    const timer = setTimeout(() => setNow(new Date()), Math.max(Date.parse(refreshAt) - Date.now(), 1_000));
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') setNow(new Date()); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [refreshAt]);
  return grid;
}
