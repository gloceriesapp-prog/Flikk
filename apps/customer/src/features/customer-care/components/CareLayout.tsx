import { ScreenSkeleton } from '../../../components/loading/ScreenSkeleton';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AccountPageHeader } from '../../../components/AccountPageHeader';
import { useAuthStore } from '../../../store/useAuthStore';
import { inaccessibleCare } from '../useCareQuery';

export function CareLayout({ title, onBack, children, allowGuest = false }: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  allowGuest?: boolean;
}) {
  const token = useAuthStore(s => s.accessToken);
  const signIn = useAuthStore(s => s.exitGuestMode);

  return (
    <View className="flex-1 bg-[#F5F6F8] pt-safe">
      <AccountPageHeader title={title} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-safe-offset-6 pt-2">
        <View className="w-full max-w-[520px] gap-4 self-center">
          {token || allowGuest ? children : (
            <>
              <CareEmpty text="Sign in to continue." />
              <CareButton label="Sign in" onPress={signIn} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function CareCard({ children }: { children: ReactNode }) {
  return <View className="rounded-[24px] border border-[#E6E8EC] bg-white p-5">{children}</View>;
}

export function CareButton({ label, onPress, disabled = false, secondary = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[48px] justify-center rounded-2xl px-4 py-3 active:opacity-80 disabled:opacity-50 ${secondary ? 'border border-[#E6E8EC] bg-white' : 'bg-primary'}`}
    >
      <Text className={`text-center text-[15px] font-semibold ${secondary ? 'text-ink' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

export function QueryNotice({ loading, error, hasData, retry }: {
  loading: boolean;
  error: unknown;
  hasData: boolean;
  retry: () => void;
}) {
  if (loading && !hasData) {
    return <ScreenSkeleton layout="list" label="Loading account information" />;
  }
  if (!error) return null;

  const message = inaccessibleCare(error)
    ? 'This information is unavailable for your account.'
    : hasData ? 'Showing your last update. New updates are temporarily unavailable.'
      : 'Couldn’t load this information. Check your connection and try again.';

  return (
    <CareCard>
      <Text className="mb-3 text-[15px] leading-[22px] text-ink/70">{message}</Text>
      <CareButton label="Retry" onPress={retry} secondary />
    </CareCard>
  );
}

export function CareEmpty({ text }: { text: string }) {
  return <CareCard><Text className="text-center text-[15px] leading-[22px] text-ink/70">{text}</Text></CareCard>;
}

export const displayDate = (value: string) => new Date(value).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
