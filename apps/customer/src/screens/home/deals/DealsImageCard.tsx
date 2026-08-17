// Just an image — no heading, no CTA, no badge. Full-width, single card.

import { Image } from 'react-native';

interface Props {
  uri: string;
}

export function DealsImageCard({ uri }: Props) {
  return <Image source={{ uri }} className="h-48 w-full rounded-3xl" resizeMode="cover" />;
}
