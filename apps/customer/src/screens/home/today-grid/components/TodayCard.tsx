import { Pressable, Text } from 'react-native';
import type { GridCard } from '../api';
import { BORDER, LINE_COLOR, RADIUS } from '../layout';
import { CardImages } from './CardImages';
import { CardTag } from './CardTag';

// White bento card: accent pill on top, centred title (2 lines) and line,
// product photos on the card's foot.
export function TodayCard({ card, width, height, pillHeight, onPress }: { card: GridCard; width: number; height: number; pillHeight: number; onPress: () => void }) {
  const titleSize = Math.max(11, Math.round(width * 0.11));
  const titleLine = Math.ceil(titleSize * 1.1);
  // Narrow phones (360 px): no room for the line, the photos come first.
  const showLine = width >= 110;
  const textHeight = titleLine * 2 + 8 + (showLine ? 15 : 0);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.tag}. ${card.line}`}
      testID={`today-card-${card.id}`} className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={card.tag} bg={card.tagBg} color={card.tagText} height={pillHeight} />
      <Text numberOfLines={2} className="px-1.5 pt-1.5 text-center font-extrabold tracking-[-0.2px] text-ink"
        style={{ fontSize: titleSize, lineHeight: titleLine }}>{card.title}</Text>
      {showLine ? <Text numberOfLines={1} className="px-1.5 text-center text-[11px] leading-[14px]" style={{ color: LINE_COLOR }}>{card.line}</Text> : null}
      <CardImages urls={card.imageUrls} width={width} height={Math.max(1, height - pillHeight - textHeight)} />
    </Pressable>
  );
}
