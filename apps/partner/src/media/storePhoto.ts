export function selectStorePhoto(publicUri: string | null, privateUri: string | null, failedUris: string[]) {
  if (publicUri && !failedUris.includes(publicUri)) return { uri: publicUri, private: false };
  if (privateUri && !failedUris.includes(privateUri)) return { uri: privateUri, private: true };
  return null;
}

// Attach owner credentials only to the configured backend, never to a CDN.
export function authenticatedPhotoSource(uri: string, token: string | null, apiBase: string) {
  try {
    const resolved = new URL(uri, `${apiBase}/`);
    const sameApi = resolved.origin === new URL(apiBase).origin;
    return { uri: resolved.toString(), headers: token && sameApi ? { Authorization: `Bearer ${token}` } : undefined };
  } catch {
    // Let the image's error/retry UI handle malformed legacy values.
    return { uri };
  }
}
