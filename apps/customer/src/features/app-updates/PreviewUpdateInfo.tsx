import { Text, View } from 'react-native';
import { runningUpdateIdentity as identity } from './nativeUpdateIdentity';

// Visible only in preview installations so device QA can read exact IDs without
// attaching a debugger to TestFlight or exposing diagnostics to normal customers.
export function PreviewUpdateInfo() {
  if (identity.channel !== 'preview') return null;
  return (
    <View testID="ota-preview-info" className="gap-2 rounded-2xl bg-gray-50 p-4">
      <Text accessibilityRole="header" className="text-base font-semibold text-ink">Preview build</Text>
      <Text selectable className="text-sm text-ink/70">Update: {identity.updateId}</Text>
      <Text selectable className="text-sm text-ink/70">Runtime: {identity.runtimeVersion}</Text>
      <Text selectable className="text-sm text-ink/70">Source: {identity.sourceCommit}</Text>
      <Text className="text-sm text-ink/70">{identity.embedded ? 'Embedded bundle' : 'Downloaded update'}</Text>
    </View>
  );
}
