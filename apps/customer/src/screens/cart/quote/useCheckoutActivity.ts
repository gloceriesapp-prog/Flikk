import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// React Query's browser focus defaults do not track native app foreground.
// Pause cart requests off-screen/background and refresh immediately on return.
export function useCheckoutActivity(): boolean {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState == null || AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  return focused && foreground;
}
