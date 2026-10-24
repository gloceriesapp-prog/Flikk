// "Log out · Delete my account" for the screens a signed-in person can reach
// before the app shell (the onboarding intro, the post-approval payout step).
// Without them someone who signed in with the wrong number, or a store
// reviewer, had no way out but uninstalling, and both stores require every
// account to be deletable from inside the app.

import { Pressable, Text, View } from 'react-native';
import { signOut } from '../api/auth';
import { DeleteAccountLink } from './DeleteAccountLink';

export function AccountExitLinks({ onDark = false }: { onDark?: boolean }) {
  return (
    <View className="mt-4 flex-row items-center justify-center gap-6">
      <Pressable onPress={() => void signOut()} hitSlop={8} accessibilityRole="button">
        <Text className={`text-sm font-semibold ${onDark ? 'text-white' : 'text-ink'}`}>Log out</Text>
      </Pressable>
      <DeleteAccountLink />
    </View>
  );
}
