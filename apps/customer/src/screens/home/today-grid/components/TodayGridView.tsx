import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard, TodayGrid } from '../api';
import { trackImpression } from '../analytics';
import { welcomeBannerRatio } from '../../welcome-banner/HomeWelcomeBanner';
import { BLOCK_BG, BLOCK_RADIUS, GAP, MARGIN, SIDE, gridMetrics, gridShape } from '../layout';
import { TodayCard } from './TodayCard';
import { TodayHero } from './TodayHero';

export const GRID_TITLE = 'Today on Gloceries';

// Presentational: light-blue bento block, hero + cards in the shape gridShape() picks. Logs one
// impression per card per session.
export function TodayGridView({ grid, headerImageUrl, onTap }: { grid: TodayGrid & { hero: GridCard }; headerImageUrl: string; onTap: (card: GridCard, position: number) => void }) {
  const { width } = useWindowDimensions();
  const { column, cardHeight, heroHeight, rowHeight, wide, inner } = gridMetrics(width);
  const [ratio, setRatio] = useState(3);
  const { shape, cards: count } = gridShape(grid.cards.length);
  const cards = grid.cards.slice(0, count);
  const slot = grid.slot ?? '';

  useEffect(() => {
    trackImpression({ cardId: grid.hero.id, slot, position: 0, hero: grid.hero.id });
    cards.forEach((card, index) => trackImpression({ cardId: card.id, slot, position: index + 1, hero: grid.hero.id }));
  }, [grid.hero.id, slot, cards]);

  return (
    <View testID={`today-grid-${shape}`} style={{ marginHorizontal: MARGIN, padding: SIDE, paddingTop: 0, borderRadius: BLOCK_RADIUS, overflow: 'hidden', backgroundColor: BLOCK_BG }}>
      {/* Header artwork (admin: Today grid > Header image) runs edge to edge across the top. */}
      <AppImage source={{ uri: headerImageUrl }} accessibilityRole="header" accessibilityLabel={GRID_TITLE} resizeMode="contain"
        style={{ marginHorizontal: -SIDE, marginBottom: GAP, aspectRatio: ratio }} onLoad={(event) => {
          const next = welcomeBannerRatio(event.source.width, event.source.height);
          if (next && next !== ratio) setRatio(next);
        }} />
      {shape === 'hero-only' ? (
        <TodayHero hero={grid.hero} width={inner} height={rowHeight} onPress={() => onTap(grid.hero, 0)} />
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
