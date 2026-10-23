const readline = require('node:readline');

const SECRET_NAMES = [
  'ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD', 'SENTRY_AUTH_TOKEN', 'GOOGLE_MAPS_API_KEY',
  'ANDROID_GOOGLE_MAPS_API_KEY', 'GOOGLE_GEOCODING_MAP_KEY', 'EXPO_PUBLIC_SENTRY_DSN',
];

function redact(line, env = process.env) {
  const values = SECRET_NAMES.map(name => env[name]).filter(Boolean).sort((a, b) => b.length - a.length);
  let result = line;
  for (const value of values) result = result.split(value).join('[redacted]');
  return result.replace(/AIza[A-Za-z0-9_-]{35}/g, '[redacted Maps key]');
}

if (require.main === module) {
  // readline retains partial lines across chunks, including split tokens.
  readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
    .on('line', line => process.stdout.write(`${redact(line)}\n`));
}

module.exports = { redact, SECRET_NAMES };
