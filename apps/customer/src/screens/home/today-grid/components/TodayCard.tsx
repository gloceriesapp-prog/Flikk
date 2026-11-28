import { Pressable, Text } from 'react-native';
import type { GridCard } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS, TAG_HEIGHT } from '../layout';
import { CardImages } from './CardImages';
import { CardTag } from './CardTag';

// White bento card: tag pill, short centred title, product photos on the foot.
export function TodayCard({ card, width, height, onPress }: { card: GridCard; width: number; height: number; onPress: () => void }) {
  const titleSize = Math.max(12, Math.round(width * 0.12));
  const titleLine = Math.ceil(titleSize * 1.12);
  const textHeight = 6 + titleLine * 2 + 4;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.tag}`}
      testID={`today-card-${card.id}`} className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={card.tag} bg={card.tagBg} color={card.tagText} />
      <Text numberOfLines={2} className="px-1.5 pt-1.5 text-center font-extrabold tracking-[-0.2px] text-ink"
        style={{ fontSize: titleSize, lineHeight: titleLine, height: titleLine * 2 + 6 }}>{card.title}</Text>
      <CardImages urls={photosFor(card.id, card.imageUrls)} width={width} height={Math.max(1, height - TAG_HEIGHT - 6 - textHeight)} />
    </Pressable>
  );
}
