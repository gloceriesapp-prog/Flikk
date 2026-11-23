import { PAGE_TITLE_CLASS_NAME } from '../../../theme/typography';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import { IconlyArrowLeft, IconlySearch } from '../../../components/icons/iconly';

interface Props {
  title: string;
  onBack: () => void;
  onSearch: () => void;
}

const buttonClass = 'h-11 w-11 shrink-0 items-center justify-center active:opacity-70';

export function CategoryDetailHeader({ title, onBack, onSearch }: Props) {
  return (
    <View className="min-h-16 flex-row items-center gap-3 px-5 py-2.5">
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} className={`${buttonClass} rounded-full border border-[#E1E5EA] bg-[#F6F7F9]`}>
        <IconlyArrowLeft size={24} color={colors.ink} />
      </Pressable>

      <View className="min-w-0 flex-1">
        <Text className={`${PAGE_TITLE_CLASS_NAME} text-ink`} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Search products" onPress={onSearch} className={buttonClass}>
        <IconlySearch size={24} color={colors.ink} />
      </Pressable>
    </View>
  );
}
