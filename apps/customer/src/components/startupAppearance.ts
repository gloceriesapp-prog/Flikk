import { createContext } from 'react';

// The startup artwork owns the system-bar backdrop only while mounted.
export const StartupAppearanceContext = createContext<((visible: boolean) => void) | null>(null);
