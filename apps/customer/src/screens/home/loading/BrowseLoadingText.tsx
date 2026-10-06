import { Text, View } from 'react-native';

export const BROWSE_LOADING_COPY = {
  grocery: 'Picking your pantry favourites…',
  fresh: 'Gathering the freshest picks…',
  regional: 'Finding local favourites…',
  festival: 'Getting festival-ready…',
  all: 'A little local goodness, coming up…',
} as const;

// Text stays still: no spinning, flashing or repeated accessibility announcements.
export function BrowseLoadingText({ message = BROWSE_LOADING_COPY.all }: { message?: string }) {
  return (
    <View accessible accessibilityLabel={message} className="items-center gap-3 px-5 py-6">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="flex-row gap-1.5">
        {[0.25, 0.5, 0.85].map((opacity) => (
          <View key={opacity} className="h-1.5 w-1.5 rounded-full bg-[#155DFC]" style={{ opacity }} />
        ))}
      </View>
      <Text className="text-center text-sm font-medium text-ink/60">{message}</Text>
    </View>
  );
}
