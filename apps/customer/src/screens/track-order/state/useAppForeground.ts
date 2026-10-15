import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// true while the app is in the foreground — tracking polls pause otherwise.
export function useAppForeground(): boolean {
  const [foreground, setForeground] = useState(AppState.currentState == null || AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  return foreground;
}
