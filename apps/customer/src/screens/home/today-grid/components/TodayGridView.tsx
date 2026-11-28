import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard, TodayGrid } from '../api';
import { trackImpression } from '../analytics';
import { BLOCK_BG, BLOCK_RADIUS, GAP, MARGIN, SIDE, gridMetrics, gridShape } from '../layout';
import { TodayCard } from './TodayCard';
import { TodayHero } from './TodayHero';

export const GRID_TITLE = 'Today on Gloceries';

// Header artwork shape = width / height of the uploaded image. Only guards
// against a broken file (no clamp to a "banner" range), so any wide or tall
// artwork shows whole at full width.
const headerRatios = new Map<string, number>();
export function headerRatio(width: number | undefined, height: number | undefined): number | null {
  if (!width || !height) return null;
  const ratio = width / height;
  return Number.isFinite(ratio) && ratio >= 0.5 && ratio <= 20 ? ratio : null;
}

// Presentational: light-blue bento block, hero + cards in the shape gridShape() picks. Logs one
// impression per card per session.
export function TodayGridView({ grid, headerImageUrl, onTap }: { grid: TodayGrid & { hero: GridCard }; headerImageUrl: string; onTap: (card: GridCard, position: number) => void }) {
  const { width } = useWindowDimensions();
  const { column, cardHeight, heroHeight, rowHeight, wide, inner } = gridMetrics(width);
  const [measured, setMeasured] = useState<{ uri: string; ratio: number } | null>(null);
  const ratio = measured?.uri === headerImageUrl ? measured.ratio : (headerRatios.get(headerImageUrl) ?? 3);
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
      {/* Full block width; height follows the image's own shape (measured on load, remembered per image). */}
      <AppImage source={{ uri: headerImageUrl }} accessibilityRole="header" accessibilityLabel={GRID_TITLE} resizeMode="cover"
        style={{ marginHorizontal: -SIDE, marginBottom: GAP, aspectRatio: ratio }} onLoad={(event) => {
          const next = headerRatio(event.source.width, event.source.height);
          if (next && next !== ratio) { headerRatios.set(headerImageUrl, next); setMeasured({ uri: headerImageUrl, ratio: next }); }
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
