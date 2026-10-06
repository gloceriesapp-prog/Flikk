// The active tab and its curves share the content surface colour.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { AppIcon } from '../../../components/AppIcon';
import type { Category } from '../data/categoryTabs';
import { CATEGORY_TAB_WIDTH } from '../data/categoryTabLayout';

interface Props {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
  activeBackgroundColor: string;
  inactiveBackgroundStyle: AnimatedStyle<{ backgroundColor: string }>;
}

export function CategoryTabItem({ category, isSelected, onPress, activeBackgroundColor, inactiveBackgroundStyle }: Props) {
  return (
    <View className="relative" style={{ width: CATEGORY_TAB_WIDTH }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={category.label}
        accessibilityState={{ selected: isSelected }}
        className="w-full items-center gap-1.5 overflow-hidden px-1 pb-1.5 pt-2.5 active:opacity-80"
        style={[styles.tab, isSelected && { backgroundColor: activeBackgroundColor }]}
      >
        {!isSelected && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, inactiveBackgroundStyle]} />
        )}
        <AppIcon icon={category.icon} size={22} color="#101C10" strokeWidth={isSelected ? 2 : 1.6} />
        <Text
          className={`text-center text-xs ${isSelected ? 'font-bold text-ink' : 'font-medium text-ink/75'}`}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {category.label}
        </Text>
      </Pressable>
      {isSelected && (
        <>
          <Svg pointerEvents="none" width={12} height={12} viewBox="0 0 12 12" style={styles.rightCurve}>
            <Path d="M0 0C0 6.627 5.373 12 12 12H0Z" fill={activeBackgroundColor} />
          </Svg>
          <Svg pointerEvents="none" width={12} height={12} viewBox="0 0 12 12" style={styles.leftCurve}>
            <Path d="M12 0C12 6.627 6.627 12 0 12H12Z" fill={activeBackgroundColor} />
          </Svg>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  rightCurve: {
    position: 'absolute',
    right: -12,
    bottom: 0,
  },
  leftCurve: {
    position: 'absolute',
    left: -12,
    bottom: 0,
  },
});
