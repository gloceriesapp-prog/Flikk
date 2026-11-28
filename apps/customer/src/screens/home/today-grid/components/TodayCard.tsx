import { Pressable, Text, View } from 'react-native';
import type { GridCard } from '../api';
import { BORDER, CARD_RADIUS, LINE_COLOR, TAG_HEIGHT, TITLE_COLOR } from '../layout';
import { CardImages } from './CardImages';
import { CardTag } from './CardTag';

// White card: border, attached tag, tinted image area, title (2 lines) and line.
export function TodayCard({ card, width, height, onPress }: { card: GridCard; width: number; height: number; onPress: () => void }) {
  const imageHeight = Math.round(height * 0.46);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.tag}. ${card.line}`}
      testID={`today-card-${card.id}`} className="overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: CARD_RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={card.tag} bg={card.tagBg} color={card.tagText} />
      <View className="flex-1 px-2 pb-2" style={{ paddingTop: 6 }}>
        <Text numberOfLines={2} className="text-[14px] font-bold leading-[17px]" style={{ color: TITLE_COLOR }}>{card.title}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[12px] leading-[15px]" style={{ color: LINE_COLOR }}>{card.line}</Text>
        <View className="flex-1" />
        <CardImages urls={card.imageUrls} accent={card.accent} height={Math.min(imageHeight, height - TAG_HEIGHT - 52)} />
      </View>
    </Pressable>
  );
}
