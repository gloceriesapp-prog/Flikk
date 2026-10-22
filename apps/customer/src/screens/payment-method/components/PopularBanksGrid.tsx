import { Pressable, Text, View } from 'react-native';
import type { NetbankingBank } from '../../../api/payments';
import { BankLogo } from './BankLogo';

export function PopularBanksGrid({ banks, selectedCode, onSelect }: {
  banks: NetbankingBank[];
  selectedCode?: string;
  onSelect: (bank: NetbankingBank) => void;
}) {
  return <View className="mb-5">
    <Text accessibilityRole="header" className="mb-3 px-1 text-[15px] font-semibold text-[#171717]">Popular banks</Text>
    <View testID="popular-banks-grid" className="flex-row flex-wrap" style={{ gap: 10 }}>
      {banks.map(bank => <Pressable key={bank.code} onPress={() => onSelect(bank)} accessibilityRole="button"
        accessibilityLabel={`Select ${bank.name}`} accessibilityState={{ selected: bank.code === selectedCode }}
        style={{ width: '30%', flexGrow: 1, maxWidth: '33%' }}
        className={`min-h-[112px] items-center gap-2 rounded-2xl border bg-white px-2 py-3 ${bank.code === selectedCode ? 'border-[#171717]' : 'border-[#E5E7EB]'}`}>
        <BankLogo code={bank.code} />
        <Text numberOfLines={2} className="text-center text-[12px] font-medium leading-4 text-[#171717]">{bank.name}</Text>
      </Pressable>)}
    </View>
  </View>;
}
