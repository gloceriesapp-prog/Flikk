import { Text, View } from 'react-native';
import { TAG_HEIGHT, TAG_LEAD_BG, TAG_LEAD_TEXT, TAG_VALUE_BG, TAG_VALUE_TEXT } from '../layout';
import { tagParts } from '../tagParts';

// Two-tone pill on top of the card: dark lead ("Up to") + lime value ("80% OFF").
export function CardTag({ label }: { label: string }) {
  const { lead, value } = tagParts(label);
  const text = { lineHeight: TAG_HEIGHT, includeFontPadding: false } as const;
  return (
    <View className="mt-2 flex-row overflow-hidden rounded-full" style={{ height: TAG_HEIGHT, maxWidth: '92%' }}>
      {lead ? <Text numberOfLines={1} className="px-2 text-[11px] font-semibold" style={{ ...text, backgroundColor: TAG_LEAD_BG, color: TAG_LEAD_TEXT }}>{lead}</Text> : null}
      <Text numberOfLines={1} className="shrink px-2 text-[11px] font-bold" style={{ ...text, backgroundColor: TAG_VALUE_BG, color: TAG_VALUE_TEXT }}>{value}</Text>
    </View>
  );
}
