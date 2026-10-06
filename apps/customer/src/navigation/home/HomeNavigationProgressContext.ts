import { createContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export const HomeNavigationProgressContext = createContext<SharedValue<number> | null>(null);
