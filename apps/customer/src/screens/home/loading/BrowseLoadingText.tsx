import { View } from 'react-native';
import { ScreenSkeleton } from '../../../components/loading/ScreenSkeleton';

export const BROWSE_LOADING_COPY = {
  grocery: 'Picking your pantry favourites…',
  fresh: 'Gathering the freshest picks…',
  regional: 'Finding local favourites…',
  festival: 'Getting festival-ready…',
  festivals: 'Getting festival-ready…',
  meat: 'Rounding up fresh cuts…',
  all: 'A little local goodness, coming up…',
} as const;

// Keep the existing call sites while replacing visible loading copy everywhere.
export function BrowseLoadingText({ message = BROWSE_LOADING_COPY.all }: { message?: string }) {
  return <View style={{ width: '100%', paddingHorizontal: 20 }}><ScreenSkeleton label={message} /></View>;
}
