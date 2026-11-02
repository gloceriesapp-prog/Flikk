import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar, type StatusBarProps } from 'expo-status-bar';

// Stack screens remain mounted underneath the active route. Only the focused
// screen should own the system bar; otherwise an old screen can win by mount
// order. Reapply on return from external UPI/native checkout activities too.
export function ScreenStatusBar(props: StatusBarProps) {
  const focused = useIsFocused();
  const [foregroundVersion, setForegroundVersion] = useState(0);
  useEffect(() => {
    if (!focused) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setForegroundVersion(version => version + 1);
    });
    return () => subscription.remove();
  }, [focused]);
  return focused ? <StatusBar key={foregroundVersion} hidden={false} {...props} /> : null;
}
