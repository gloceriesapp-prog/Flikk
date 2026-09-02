import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ALL_TAB, type Category } from '../data/categoryTabs';

interface Props {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
  // Retained so we don't break the parent component, 
  // but it is no longer needed for the masking hack!
  headerBottomColor: string; 
}

export function CategoryTabItem({ category, isSelected, onPress, headerBottomColor }: Props) {
  const selectedBg = category.id === ALL_TAB.id ? '#E7F5EE' : '#FFFFFF';

  return (
    <View className="relative w-[76px]">
      <Pressable
        onPress={onPress}
        // Unselected tabs get the white/30 background. Selected gets its specific color via style.
        className={`w-full items-center gap-1.5 py-3 rounded-t-[24px] z-10 ${
          isSelected ? '' : 'bg-white/30'
        }`}
        style={isSelected ? { backgroundColor: selectedBg } : undefined}
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

      {/* Bottom Scoops (True SVG Negative Space) */}
      {isSelected && (
        <>
          {/* Left Scoop */}
          <View className="absolute -left-[20px] bottom-0 h-[20px] w-[20px] z-0 pointer-events-none">
            <Svg width="20" height="20" viewBox="0 0 20 20">
              {/* Draws strictly the filled white corner, leaving the rest 100% transparent */}
              <Path d="M20 0 C20 11.0457 11.0457 20 0 20 L20 20 Z" fill={selectedBg} />
            </Svg>
          </View>

          {/* Right Scoop */}
          <View className="absolute -right-[20px] bottom-0 h-[20px] w-[20px] z-0 pointer-events-none">
            <Svg width="20" height="20" viewBox="0 0 20 20">
              {/* Draws strictly the filled white corner, leaving the rest 100% transparent */}
              <Path d="M0 0 C0 11.0457 8.9543 20 20 20 L0 20 Z" fill={selectedBg} />
            </Svg>
          </View>
        </>
      )}
    </View>
  );
}