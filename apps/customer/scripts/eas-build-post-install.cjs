/* global __dirname */
// EAS release builds (preview + production) cannot silently ship without release configuration.
if (['production', 'preview'].includes(process.env.EAS_BUILD_PROFILE)) {
  require('./verify-release.cjs');
  require('node:child_process').execFileSync(process.execPath, [require('node:path').join(__dirname, 'exclude-dev-client.cjs')], { stdio: 'inherit' });
}
