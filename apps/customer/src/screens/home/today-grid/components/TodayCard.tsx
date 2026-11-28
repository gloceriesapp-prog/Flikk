import { Pressable, Text } from 'react-native';
import type { GridCard } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS, TAG_HEIGHT } from '../layout';
import { CardImages } from './CardImages';
import { CardTag } from './CardTag';

// White bento card: short centred title, product photos filling the middle,
// offer strip across the foot.
export function TodayCard({ card, width, height, onPress }: { card: GridCard; width: number; height: number; onPress: () => void }) {
  const titleSize = Math.max(13, Math.round(width * 0.125));
  const titleLine = Math.ceil(titleSize * 1.12);
  const titleBox = 8 + titleLine * 2 + 4;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.tag}`}
      testID={`today-card-${card.id}`} className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <Text numberOfLines={2} className="px-1.5 text-center font-bold tracking-[-0.2px] text-ink"
        style={{ fontSize: titleSize, lineHeight: titleLine, height: titleBox, paddingTop: 8 }}>{card.title}</Text>
      <CardImages urls={photosFor(card.id, card.imageUrls)} width={width} height={Math.max(1, height - titleBox - TAG_HEIGHT - 2)} />
      <CardTag label={card.tag} bg={card.tagBg} color={card.tagText} />
    </Pressable>
  );
}
