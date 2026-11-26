import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { Apple01Icon, CarrotIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { FRESH_CHOICES, freshTabTitle, type FreshTabs } from '../../content/contracts';
import type { FreshProduceMode } from '../freshProduceSections';


// Three choices side by side (Vegetables, Fruits, Village Fresh). Each
// outline is 200 units wide on one full-width 600-unit canvas, all meeting
// at the same baseline; inactive tabs close along the bottom.
const TAB_CURVE = 'M0 95C4 95 6 93 7 89C8 86 8 81 9 76L14 27Q18 6 39 6H161Q182 6 186 27L191 76C192 81 192 86 193 89C194 93 196 95 200 95';

function GrowerIcon({ color = '#616871' }: { color?: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M12 21V11M12 14C6 14 3 11 3 5c6 0 9 3 9 9ZM12 11c0-5 3-8 9-8 0 6-3 9-9 9" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

// Small lime sprig either side of the heading (mirrored on the right).
function Sprig({ flip = false }: { flip?: boolean }) {
  return <Svg width={22} height={14} viewBox="0 0 22 14" accessible={false} style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
    <Path d="M1 9C6 9 10 7 14 4" stroke="#A8D93A" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    <Path d="M14 4C15.5 1.6 18.4 0.8 21 1.5C20.4 4.2 18 6 15.2 5.6Z" fill="#A8D93A" />
    <Path d="M9 7.2C9.8 9.6 12.3 11.2 15 11C14.4 8.6 12 7 9 7.2Z" fill="#C6E77A" />
  </Svg>;
}

// Heading above the three choices.
export function FreshHeading() {
  return <View className="items-center px-5 pb-4" accessible accessibilityRole="header"
    accessibilityLabel="Fresh Every Morning. Picked today for your kitchen">
    <View className="flex-row items-center gap-2">
      <Sprig />
      <Text className="text-[23px] font-bold tracking-tight" style={{ color: '#1E4D33', lineHeight: 28 }}>Fresh Every Morning</Text>
      <Sprig flip />
    </View>
    <Text className="mt-1 text-[14px] font-semibold" style={{ color: '#3E6E4E' }}>Picked today for your kitchen</Text>
  </View>;
}

export function FreshProduceTabs({ value, onChange, titles }: { value: FreshProduceMode; onChange: (mode: FreshProduceMode) => void; titles?: FreshTabs }) {
  const options = FRESH_CHOICES.map(id => {
    const title = freshTabTitle(titles, id);
    return { id, title };
  });
  return <View className="w-full bg-white pt-8">
    <FreshHeading />
    <View className="relative h-[96px] w-full flex-row">
      <Svg width="100%" height={96} viewBox="0 0 600 96" preserveAspectRatio="none" accessible={false} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }}>
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
          {/* Icon centred on top, title centred underneath. */}
          <View className="w-full items-center justify-center gap-1.5 px-2">
            <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: active ? '#D8EBCF' : '#F4F5F2' }}>
              {option.id === 'village' ? <GrowerIcon color={active ? '#557746' : '#616871'} />
                : <AppIcon icon={option.id === 'fruits' ? Apple01Icon : CarrotIcon} size={24} color={active ? '#557746' : '#616871'} />}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} className="text-center text-[13px] font-semibold leading-[17px]"
              style={{ color: active ? '#327044' : '#454B54' }}>{option.title}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    <View className="h-2 w-full bg-white" />
  </View>;
}
