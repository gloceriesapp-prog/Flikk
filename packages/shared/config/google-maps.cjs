// Native SDK credentials belong to the app build. Server web-service keys
// belong only to the backend environment and must never be used for tiles.
function resolveNativeMapKeys(env = process.env) {
  const read = (name) => typeof env[name] === 'string' ? env[name].trim() : '';
  const androidNames = ['GOOGLE_GEOCODING_MAP_KEY', 'ANDROID_GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_API_KEY'];
  const configuredAndroid = androidNames.map(read).filter(Boolean);
  if (new Set(configuredAndroid).size > 1) {
    throw new Error('Android map key variables disagree. Set only GOOGLE_GEOCODING_MAP_KEY, ANDROID_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY, or make their values match.');
  }
  const androidGoogleMapsApiKey = configuredAndroid[0] || undefined;
  const iosGoogleMapsApiKey = read('IOS_GOOGLE_MAPS_API_KEY') || undefined;
  for (const key of [androidGoogleMapsApiKey, iosGoogleMapsApiKey].filter(Boolean)) {
    if (!/^AIza[A-Za-z0-9_-]{35}$/.test(key)) {
      throw new Error('Native Google Maps credentials must be valid API keys, without quotes, URLs or placeholders.');
    }
    for (const name of ['GOOGLE_GEOCODING_API_KEY', 'GOOGLE_GEOCODING_ROUTE_KEY', 'GOOGLE_ROUTES_API_KEY', 'GOOGLE_PLACES_API_KEY']) {
      if (key === read(name)) throw new Error(`Use a separate native Maps SDK key; ${name} is a backend-only credential.`);
    }
  }
  // EAS resolves project metadata locally before fetching remote variables.
  // Enforce only on the actual Android builder, where those variables exist.
  const releaseAndroid = env.EAS_BUILD === 'true' && env.EAS_BUILD_PLATFORM === 'android'
    && !String(env.EAS_BUILD_PROFILE || '').startsWith('development');
  if (releaseAndroid && !androidGoogleMapsApiKey) {
    throw new Error('Set ANDROID_GOOGLE_MAPS_API_KEY in this app’s EAS build environment before building Android.');
  }
  return { androidGoogleMapsApiKey, iosGoogleMapsApiKey };
}

module.exports = { resolveNativeMapKeys };
