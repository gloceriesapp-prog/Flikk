import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { updateIdentity } from './updateIdentity';

// The compiled public source stamp wins over manifest metadata on republish/rollback.
export const runningUpdateIdentity = updateIdentity(Updates,
  process.env.EXPO_PUBLIC_SOURCE_COMMIT || Constants.expoConfig?.extra?.release?.sourceCommit);
