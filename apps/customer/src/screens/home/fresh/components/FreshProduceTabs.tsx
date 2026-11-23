import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { CarrotIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { DEFAULT_FRESH_TABS, type FreshTabs } from '../../content/contracts';
import type { FreshProduceMode } from '../freshProduceSections';

const MODES = ['everyday', 'village'] as const;

// Both outlines meet at the same baseline on one full-width canvas.
// Only the inactive half closes along the bottom: no duplicate View border.
const TAB_CURVE = 'M0 95C4 95 6 93 7 89C8 86 8 81 9 76L14 27Q18 6 39 6H161Q182 6 186 27L191 76C192 81 192 86 193 89C194 93 196 95 200 95';

function GrowerIcon({ color = '#616871' }: { color?: string }) {
  return <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M12 21V11M12 14C6 14 3 11 3 5c6 0 9 3 9 9ZM12 11c0-5 3-8 9-8 0 6-3 9-9 9" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

export function FreshProduceTabs({ value, onChange, titles = DEFAULT_FRESH_TABS }: { value: FreshProduceMode; onChange: (mode: FreshProduceMode) => void; titles?: FreshTabs }) {
  const options = MODES.map(id => {
    const title = titles[id];
    const words = title.split(/\s+/);
    const middle = Math.ceil(words.length / 2);
    return { id, title, display: words.length > 1 ? `${words.slice(0, middle).join(' ')}\n${words.slice(middle).join(' ')}` : title };
  });
  return <View className="w-full bg-white pt-4">
    <View className="relative h-[96px] w-full flex-row">
      <Svg width="100%" height={96} viewBox="0 0 400 96" preserveAspectRatio="none" accessible={false} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="fresh-active-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E3F2DF" />
            <Stop offset="0.55" stopColor="#F2F8EF" />
            <Stop offset="1" stopColor="#FFFFFF" />
          </LinearGradient>
        </Defs>
        {options.map((option, index) => {
          const active = value === option.id;
          return <G key={option.id} transform={`translate(${index * 200}, 0)`}>
            <Path d={`${TAB_CURVE}L200 96H0Z`} fill={active ? 'url(#fresh-active-fill)' : '#FFFFFF'} />
            <Path d={TAB_CURVE} fill="none" stroke={active ? '#72AD67' : '#DCE3DA'} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {!active && <Path d="M200 95H0" fill="none" stroke="#72AD67" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </G>;
        })}
      </Svg>
      {options.map(option => {
        const active = value === option.id;
        return <Pressable key={option.id} accessibilityRole="tab" accessibilityLabel={option.title}
          accessibilityState={{ selected: active }} onPress={() => onChange(option.id)} className="h-[96px] min-w-0 flex-1 justify-center pt-2">
          <View className="w-full flex-row items-center justify-center gap-3 px-5">
            <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: active ? '#D8EBCF' : '#F4F5F2' }}>
              {option.id === 'everyday' ? <AppIcon icon={CarrotIcon} size={28} color={active ? '#557746' : '#616871'} /> : <GrowerIcon color={active ? '#557746' : '#616871'} />}
            </View>
            <View className="min-w-0 shrink">
              <Text className="text-[14px] font-semibold leading-[19px]" style={{ color: active ? '#327044' : '#454B54' }}>{option.display}</Text>
            </View>
          </View>
        </Pressable>;
      })}
    </View>
    <View className="h-2 w-full bg-white" />
  </View>;
}
