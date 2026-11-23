import { PAGE_TITLE_CLASS_NAME } from '../theme/typography';
import { Pressable, Text, View } from 'react-native';
import { IconlyArrowLeft } from './icons/iconly';
import { colors } from '../theme/tokens';

interface Props {
  title: string;
  onBack: () => void;
  backLabel?: string;
}

export function AccountPageHeader({ title, onBack, backLabel = 'Go back' }: Props) {
  return (
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={{ borderColor: colors.divider }}
        className="h-11 w-11 items-center justify-center rounded-full border bg-white active:opacity-70"
      >
        <IconlyArrowLeft size={21} color={colors.ink} />
      </Pressable>
      <Text accessibilityRole="header" className={`${PAGE_TITLE_CLASS_NAME} flex-1 text-center leading-6 text-ink`}>
        {title}
      </Text>
      <View className="w-11" />
    </View>
  );
}
