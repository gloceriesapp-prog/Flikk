// "Delivers in ~9 min" honest-ETA line — per specs/00-foundation/design-system.md's
// "speed reads as trust" principle: state the ETA before the user asks,
// don't make them dig for it.

import { Text } from 'react-native';

interface Props {
  minutes: number;
}

export function EtaBadge({ minutes }: Props) {
  // return <Text className="text-lg font-semibold text-ink">Delivers in ~{minutes} min</Text>;
}
