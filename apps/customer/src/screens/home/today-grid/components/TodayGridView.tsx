import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard, TodayGrid } from '../api';
import { trackImpression } from '../analytics';
import { BLOCK_BG, BLOCK_RADIUS, GAP, MARGIN, SIDE, TITLE_COLOR, gridMetrics, gridShape } from '../layout';
import { TodayCard } from './TodayCard';
import { TodayHero } from './TodayHero';

export const GRID_TITLE = 'Today on Gloceries';

// Presentational: light-blue bento block, hero + cards in the shape gridShape() picks. Logs one
// impression per card per session.
export function TodayGridView({ grid, headerImageUrl = null, onTap }: { grid: TodayGrid & { hero: GridCard }; headerImageUrl?: string | null; onTap: (card: GridCard, position: number) => void }) {
  const { width } = useWindowDimensions();
  const { column, cardHeight, pillHeight, heroHeight, rowHeight, wide, inner } = gridMetrics(width);
  const { shape, cards: count } = gridShape(grid.cards.length);
  const cards = grid.cards.slice(0, count);
  const slot = grid.slot ?? '';

  useEffect(() => {
    trackImpression({ cardId: grid.hero.id, slot, position: 0, hero: grid.hero.id });
    cards.forEach((card, index) => trackImpression({ cardId: card.id, slot, position: index + 1, hero: grid.hero.id }));
  }, [grid.hero.id, slot, cards]);

  return (
    <View testID={`today-grid-${shape}`} style={{ marginHorizontal: MARGIN, padding: SIDE, paddingTop: headerImageUrl ? 0 : 12, borderRadius: BLOCK_RADIUS, overflow: 'hidden', backgroundColor: BLOCK_BG }}>
      {/* Admin artwork (App content) runs edge to edge across the top; else the title in text. */}
      {headerImageUrl ? (
        <AppImage source={{ uri: headerImageUrl }} accessibilityLabel={GRID_TITLE} resizeMode="cover"
          style={{ marginHorizontal: -SIDE, marginBottom: GAP, aspectRatio: 3 }} />
      ) : (
        <Text accessibilityRole="header" className="mb-2.5 px-1 text-[18px] font-extrabold tracking-[-0.3px]" style={{ color: TITLE_COLOR }}>{GRID_TITLE}</Text>
      )}
      {shape === 'hero-only' ? (
        <TodayHero hero={grid.hero} width={inner} height={rowHeight} pillHeight={pillHeight} onPress={() => onTap(grid.hero, 0)} />
      ) : (
        <View className="flex-row" style={{ gap: GAP }}>
          <TodayHero hero={grid.hero} width={column} height={shape === 'full' ? heroHeight : rowHeight} pillHeight={pillHeight} onPress={() => onTap(grid.hero, 0)} />
          <View className="flex-row flex-wrap" style={{ gap: GAP, width: wide }}>
            {cards.map((card, index) => (
              <TodayCard key={card.id} card={card} width={column} height={shape === 'full' ? cardHeight : rowHeight} pillHeight={pillHeight} onPress={() => onTap(card, index + 1)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
