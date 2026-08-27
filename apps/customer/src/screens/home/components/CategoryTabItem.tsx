import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { Category } from '../data/categoryTabs';

interface Props {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
}

export function CategoryTabItem({ category, isSelected, onPress }: Props) {
  // [Certain] This must exactly match the light pastel fill behind the tabs.
  const parentBackgroundColor = '#121212'; 

  return (
    <View className="relative w-[76px]">
      <Pressable
        onPress={onPress}
        className={`w-full items-center gap-1.5 py-3 rounded-t-[24px] z-10 ${
          isSelected ? 'bg-white' : 'bg-white/60' 
        }`}
      >
        <AppIcon 
          icon={category.icon} 
          size={22} 
          color={isSelected ? colors.ink : `${colors.ink}99`} 
        />
        <Text
          className={`text-center text-xs ${
            isSelected ? 'font-bold text-ink' : 'font-medium text-ink/60'
          }`}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {category.label}
        </Text>
      </Pressable>

      {/* Bottom Scoops (Inverse Border Radius) */}
      {isSelected && (
        <>
          {/* Left Scoop */}
          <View className="absolute -left-[20px] bottom-0 h-[20px] w-[20px] bg-white z-0">
            <View
              className="h-full w-full rounded-br-[20px]"
              style={{ backgroundColor: parentBackgroundColor }}
            />
          </View>

          {/* Right Scoop */}
          <View className="absolute -right-[20px] bottom-0 h-[20px] w-[20px] bg-white z-0">
            <View
              className="h-full w-full rounded-bl-[20px]"
              style={{ backgroundColor: parentBackgroundColor }}
            />
          </View>
        </>
      )}
    </View>
  );
}