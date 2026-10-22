import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { PopularBanksGrid } from './PopularBanksGrid';
import { BankLogo } from './BankLogo';
import { AppIcon } from '../../../components/AppIcon';
import { fetchNetbankingBanks, type NetbankingBank } from '../../../api/payments';

const POPULAR_BANK_CODES = ['HDFC', 'SBIN', 'ICIC', 'UTIB', 'KKBK', 'IDFB'];

interface Props {
  visible: boolean;
  selectedCode?: string;
  onClose: () => void;
  onSelect: (bank: NetbankingBank) => void;
}

export function NetbankingBankPicker({ visible, selectedCode, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['netbanking-banks'], queryFn: fetchNetbankingBanks,
    enabled: visible, staleTime: 0, retry: false });
  const term = search.trim().toLocaleLowerCase();
  const banks = query.data?.banks.filter(bank => `${bank.name} ${bank.code}`.toLocaleLowerCase().includes(term)) ?? [];
  // Popularity only changes display order; every choice must exist in the
  // current provider response. Search includes every available bank once.
  const popular = POPULAR_BANK_CODES.flatMap(code => banks.filter(bank => bank.code === code));
  const remaining = banks.filter(bank => !POPULAR_BANK_CODES.includes(bank.code));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setSearch('')}>
      <View className="flex-1 bg-[#F2F2F7] pt-safe">
        <View className="w-full max-w-[520px] flex-1 self-center px-5">
          <View className="flex-row items-center gap-3 py-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Back to payment methods" onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <AppIcon icon={ArrowLeft01Icon} size={22} color="#171717" />
            </Pressable>
            <Text className="text-[19px] font-semibold text-[#171717]">Choose your bank</Text>
          </View>
          <TextInput accessibilityLabel="Search banks" placeholder="Search bank name" value={search} onChangeText={setSearch}
            autoCorrect={false} autoCapitalize="none" placeholderTextColor="#8C8C93"
            className="mb-4 min-h-[48px] rounded-xl border border-[#E5E7EB] bg-white px-4 text-[15px] text-[#171717]" />
          {query.isFetching ? <ActivityIndicator accessibilityLabel="Loading banks" color="#171717" className="mt-6" />
            : query.isError ? <View className="gap-3 rounded-2xl bg-white p-4">
              <Text className="text-[14px] text-[#525252]">Couldn’t load available banks. Please try again.</Text>
              <Pressable accessibilityRole="button" onPress={() => void query.refetch()} className="min-h-11 justify-center">
                <Text className="font-semibold text-[#171717]">Retry banks</Text>
              </Pressable>
            </View> : <FlatList data={term ? banks : remaining} keyExtractor={bank => bank.code} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}
              ListHeaderComponent={<>
                {!term && popular.length > 0 && <PopularBanksGrid banks={popular} selectedCode={selectedCode} onSelect={onSelect} />}
                {(term ? banks.length > 0 : remaining.length > 0) && <Text accessibilityRole="header" className="mb-3 mt-1 px-1 text-[15px] font-semibold text-[#171717]">{term ? 'Search results' : popular.length ? 'All other banks' : 'All banks'}</Text>}
              </>}
              ListEmptyComponent={banks.length === 0 ? <Text className="px-2 py-6 text-[14px] text-[#737373]">{term ? 'No banks match your search.' : 'Netbanking is unavailable right now. Choose another payment method.'}</Text> : null}
              renderItem={({ item }) => <Pressable onPress={() => onSelect(item)} accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`} accessibilityState={{ selected: selectedCode === item.code }}
                className="mb-2 min-h-[68px] flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <BankLogo code={item.code} />
                <Text className="flex-1 text-[14px] font-medium leading-5 text-[#171717]">{item.name}</Text>
                <AppIcon icon={ArrowRight01Icon} size={18} color="#737373" />
              </Pressable>} />}
        </View>
      </View>
    </Modal>
  );
}
