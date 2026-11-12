// Text suggestions under the search bar while typing (searchTypeahead.ts).
// Product/flavour rows and the last "Search for" row run the item search.
import { Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { splitMatch, type TypeaheadSuggestion } from '../searchTypeahead';

interface Props {
  query: string;
  suggestions: TypeaheadSuggestion[];
  onPick: (suggestion: TypeaheadSuggestion) => void;
  onSearch: () => void;
}

function Row({ label, query, onPress }: { label: string; query: string; onPress: () => void }) {
  const [before, match, after] = splitMatch(label, query);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-[#F6F7F9]">
      <AppIcon icon={Search01Icon} size={18} color="#6B7280" />
      <Text numberOfLines={1} className="flex-1 text-[15px] text-ink/70">
        {before}<Text className="font-semibold text-ink">{match}</Text>{after}
      </Text>
    </Pressable>
  );
}

export function SearchTypeahead({ query, suggestions, onPick, onSearch }: Props) {
  return (
    <View className="py-1">
      {suggestions.map((s) => (
        <Row key={s.label} label={s.label} query={query}
          onPress={() => onPick(s)} />
      ))}
      <Row label={`Search for "${query.trim()}"`} query={query} onPress={onSearch} />
    </View>
  );
}
