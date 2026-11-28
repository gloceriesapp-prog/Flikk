import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { GridCard, TodayGrid } from '../api';
import { trackImpression } from '../analytics';
import { GAP, SIDE, TITLE_COLOR, gridMetrics, gridShape } from '../layout';
import { TodayCard } from './TodayCard';
import { TodayHero } from './TodayHero';

export const GRID_TITLE = 'Today on Gloceries';

// Presentational: hero + cards in the shape gridShape() picks. Logs one
// impression per card per session.
export function TodayGridView({ grid, onTap }: { grid: TodayGrid & { hero: GridCard }; onTap: (card: GridCard, position: number) => void }) {
  const { width } = useWindowDimensions();
  const { column, cardHeight, heroHeight, rowHeight, wide } = gridMetrics(width);
  const { shape, cards: count } = gridShape(grid.cards.length);
  const cards = grid.cards.slice(0, count);
  const slot = grid.slot ?? '';

  useEffect(() => {
    trackImpression({ cardId: grid.hero.id, slot, position: 0, hero: grid.hero.id });
    cards.forEach((card, index) => trackImpression({ cardId: card.id, slot, position: index + 1, hero: grid.hero.id }));
  }, [grid.hero.id, slot, cards]);

  return (
    <View style={{ paddingHorizontal: SIDE }} testID={`today-grid-${shape}`}>
      <Text accessibilityRole="header" className="mb-2.5 text-[18px] font-extrabold tracking-[-0.3px]" style={{ color: TITLE_COLOR }}>{GRID_TITLE}</Text>
      {shape === 'hero-only' ? (
        <TodayHero hero={grid.hero} width={width - SIDE * 2} height={cardHeight} onPress={() => onTap(grid.hero, 0)} />
      ) : (
        <View className="flex-row" style={{ gap: GAP }}>
          <TodayHero hero={grid.hero} width={column} height={shape === 'full' ? heroHeight : rowHeight} onPress={() => onTap(grid.hero, 0)} />
          <View className="flex-row flex-wrap" style={{ gap: GAP, width: wide }}>
            {cards.map((card, index) => (
              <TodayCard key={card.id} card={card} width={column} height={shape === 'full' ? cardHeight : rowHeight} onPress={() => onTap(card, index + 1)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
