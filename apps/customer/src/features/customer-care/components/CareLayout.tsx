import { inaccessibleCare } from '../useCareQuery';
import { useAuthStore } from '../../../store/useAuthStore';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
export function CareLayout({ title, onBack, children }: {
    title: string;
    onBack: () => void;
    children: ReactNode;
}) {
    const token = useAuthStore(s => s.accessToken);
    const signIn = useAuthStore(s => s.exitGuestMode);
    return <View className="flex-1 bg-[#F5F6F8] pt-safe">
  <View className="flex-row items-center px-5 py-3">
   <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} className="h-10 w-10 items-center justify-center rounded-full bg-white"><AppIcon icon={ArrowLeft01Icon} size={22} color="#111"/></Pressable>
   <Text className="flex-1 text-center text-lg font-bold text-black">{title}</Text><View className="w-10"/>
  </View>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5 pb-safe-offset-6 pt-3">{token ? children : <><CareEmpty text="Sign in to view your orders, support requests and refunds."/><CareButton label="Sign in" onPress={signIn}/></>}</ScrollView>
 </View>;
}
export function CareButton({ label, onPress, disabled = false }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} className="rounded-2xl bg-primary px-4 py-3" style={{ opacity: disabled ? .5 : 1 }}><Text className="text-center text-sm font-bold text-white">{label}</Text></Pressable>;
}
export function QueryNotice({ loading, error, hasData, retry }: {
    loading: boolean;
    error: unknown;
    hasData: boolean;
    retry: () => void;
}) {
    if (loading && !hasData)
        return <ActivityIndicator accessibilityLabel="Loading"/>;
    if (!error)
        return null;
    return <View className="rounded-2xl bg-white p-4"><Text className="mb-3 text-sm text-gray-600">{inaccessibleCare(error) ? 'This information is no longer available for your account.' : hasData ? 'Showing your last update. New updates are temporarily unavailable.' : 'Could not load this information. Check your connection and retry.'}</Text><CareButton label="Retry" onPress={retry}/></View>;
}
export function CareEmpty({ text }: {
    text: string;
}) { return <View className="rounded-3xl bg-white p-6"><Text className="text-center text-sm text-gray-600">{text}</Text></View>; }
export const displayDate = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
