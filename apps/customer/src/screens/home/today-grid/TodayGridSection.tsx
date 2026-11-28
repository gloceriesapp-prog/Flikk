// "Today on Gloceries" on Home: server-chosen hero + up to 4 cards
// (backend/src/today-grid). Skeleton while loading; nothing when the grid is
// switched off, unavailable here, or fails (Home keeps working).
import { View } from 'react-native';
import type { GridCard } from './api';
import { trackAddToCart, trackTap } from './analytics';
import { TodayGridSkeleton } from './components/TodayGridSkeleton';
import { TodayGridView } from './components/TodayGridView';
import { useCardTap } from './useCardTap';
import { useTodayGrid } from './useTodayGrid';

export function TodayGridSection() {
  const { data, isPending, isError } = useTodayGrid();
  const slot = data?.slot ?? '';
  const heroId = data?.hero?.id ?? '';
  const tap = useCardTap((card, _count) => trackAddToCart({ cardId: card.id, slot, position: -1, hero: heroId }));
  if (isError) return null;
  if (isPending || !data) return <View className="bg-white pt-3"><TodayGridSkeleton /></View>;
  if (!data.enabled || !data.hero) return null;
  const hero = data.hero;
  const onTap = (card: GridCard, position: number) => {
    trackTap({ cardId: card.id, slot, position, hero: hero.id });
    void tap(card);
  };
  return <View className="bg-white pt-3"><TodayGridView grid={{ ...data, hero }} onTap={onTap} /></View>;
}
