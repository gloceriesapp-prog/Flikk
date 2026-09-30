// One title style for every Home "All" section heading — so titles don't
// drift (they had ranged 17px–20px, semibold/bold, text-ink vs text-black/80,
// mb-3 vs mb-4). Bumped to text-xl (20px) for mobile readability per an
// explicit ask. Carries its own px-5 gutter + mb-4 gap, so a section wrapper
// should NOT also add px-5 (double-pads) — only ProductSection/DealsSection/
// CategorySectionGroup keep a wrapper px-5 for their grid math and pass their
// title's inset differently (see those files).

import { Text, View } from 'react-native';

// Optional `subtitle` — admin-driven per-section sub-copy (useHomeSections).
// When set, the title gets a muted line under it and the group keeps the same
// mb-4 gap; when unset it renders exactly as before (single title line).
export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string | null }) {
  if (!subtitle) {
    return <Text className="mb-4 px-5 text-[18px] font-bold tracking-tight text-ink/90">{children}</Text>;
  }
  return (
    <View className="mb-4 px-5">
      <Text className="text-[18px] font-bold tracking-tight text-ink/90">{children}</Text>
      <Text className="mt-0.5 text-[13px] font-medium text-ink/50">{subtitle}</Text>
    </View>
  );
}
