// Top-right avatar entry point. Profile screen (PRD C11) isn't built yet —
// onPress is a no-op stub until that route exists, deliberately not wired to
// a screen that would crash navigation.

import { UserIcon } from '@hugeicons/core-free-icons';
import { Pressable } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export function ProfileAvatarButton() {
  return (
    <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-black/10">
      <AppIcon icon={UserIcon} size={20} color={colors.ink} />
    </Pressable>
  );
}
