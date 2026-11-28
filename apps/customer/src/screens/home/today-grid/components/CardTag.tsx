import { Text, View } from 'react-native';
import { TAG_HEIGHT, TAG_LEAD_BG, TAG_LEAD_TEXT, TAG_VALUE_BG, TAG_VALUE_TEXT } from '../layout';
import { tagParts } from '../tagParts';

const CURVE = 10;

// Two-tone tab hanging from the card's top edge: flat top, rounded bottom
// corners; dark lead ("Up to") + lime value ("80% OFF").
export function CardTag({ label }: { label: string }) {
  const { lead, value } = tagParts(label);
  return (
    <View className="flex-row overflow-hidden" style={{ height: TAG_HEIGHT, maxWidth: '92%', borderBottomLeftRadius: CURVE, borderBottomRightRadius: CURVE }}>
      {lead ? (
        <View className="justify-center px-2" style={{ backgroundColor: TAG_LEAD_BG }}>
          <Text numberOfLines={1} className="text-[11px] font-semibold" style={{ color: TAG_LEAD_TEXT, includeFontPadding: false }}>{lead}</Text>
        </View>
      ) : null}
      <View className="shrink justify-center px-2" style={{ backgroundColor: TAG_VALUE_BG }}>
        <Text numberOfLines={1} className="text-[11px] font-bold" style={{ color: TAG_VALUE_TEXT, includeFontPadding: false }}>{value}</Text>
      </View>
    </View>
  );
}
