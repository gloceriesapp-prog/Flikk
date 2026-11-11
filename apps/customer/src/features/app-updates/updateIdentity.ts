export interface UpdateIdentity {
  sourceCommit: string;
  updateId: string;
  runtimeVersion: string;
  channel: string;
  embedded: boolean;
  emergency: boolean;
}
interface NativeUpdateInfo {
  updateId?: string | null;
  runtimeVersion?: string | null;
  channel?: string | null;
  isEmbeddedLaunch?: boolean;
  isEmergencyLaunch?: boolean;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function updateIdentity(native: NativeUpdateInfo, source: unknown): UpdateIdentity {
  return {
    sourceCommit: typeof source === 'string' && /^[a-f0-9]{40}$/.test(source) ? source : 'unknown',
    updateId: native.updateId && UUID.test(native.updateId) ? native.updateId : 'embedded-or-development',
    runtimeVersion: native.runtimeVersion && /^[a-zA-Z0-9._-]{1,100}$/.test(native.runtimeVersion) ? native.runtimeVersion : 'unknown',
    channel: native.channel === 'preview' || native.channel === 'production' ? native.channel : 'unknown',
    embedded: native.isEmbeddedLaunch === true,
    emergency: native.isEmergencyLaunch === true,
  };
}
export function updateTags(identity: UpdateIdentity): Record<string, string> {
  return { app_source_commit: identity.sourceCommit, expo_update_id: identity.updateId,
    expo_runtime: identity.runtimeVersion, expo_channel: identity.channel,
    expo_embedded: String(identity.embedded), expo_emergency: String(identity.emergency) };
}
