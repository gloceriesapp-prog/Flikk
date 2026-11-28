import { Pressable, Text } from 'react-native';
import type { GridCard } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS, TAG_HEIGHT, titleMetrics } from '../layout';
import { CardImages } from './CardImages';
import { CardTag } from './CardTag';

// White bento card: tag pill and short centred title on top, product photos
// filling the rest.
export function TodayCard({ card, width, height, onPress }: { card: GridCard; width: number; height: number; onPress: () => void }) {
  const title = titleMetrics(width);
  const top = TAG_HEIGHT + 6 + title.height;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.tag}`}
      testID={`today-card-${card.id}`} className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={card.tag} />
      <Text numberOfLines={2} className="mt-1.5 px-1.5 text-center font-semibold tracking-[-0.2px] text-ink"
        style={{ fontSize: title.size, lineHeight: title.line, height: title.height }}>{card.title}</Text>
      <CardImages urls={photosFor(card.id, card.imageUrls)} width={width} height={Math.max(1, height - top - 6)} />
    </Pressable>
  );
}
