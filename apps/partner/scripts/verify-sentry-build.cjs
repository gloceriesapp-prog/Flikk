// EAS invokes this after dependency installation and before native compilation.
// Never print CLI output: it can contain private account information.
if (process.env.EAS_BUILD === 'true' && ['production', 'release-validation'].includes(process.env.EAS_BUILD_PROFILE)) {
  require('../config-monitoring.cjs').validateMonitoringConfig(process.env);
  const { spawnSync } = require('node:child_process');
  const SentryCli = require('@sentry/cli');
  const result = spawnSync(SentryCli.getPath(), ['info'], {
    env: process.env, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error('Sentry authentication preflight failed. Check SENTRY_AUTH_TOKEN permissions for the configured organization before rebuilding.');
  }
  console.log('Sentry build authentication preflight passed.');
}
