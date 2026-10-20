/* global __dirname */
// Run locally by a repository admin. Secret values go to gh through stdin.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

const repo = 'gloceriesapp-prog/Flikk';
const environment = 'partner-android-production';
const publicUploadCert = '4408C2206DED628D6888218C90DD9FCFEE7A7F7A018ECEA827910AA84B72DAD8';

function gh(args, input) {
  try {
    return execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    throw new Error('GitHub setup failed. Check repository-admin access and the required gh authentication scopes. Private output was withheld.');
  }
}

function configure(credentialsPath, env = process.env) {
  const access = JSON.parse(gh(['api', `repos/${repo}`]));
  assert.equal(access.permissions?.admin, true, 'GitHub repository-admin access is required to create the release environment and secrets.');
  assert.ok(credentialsPath, 'Pass the path to the existing EAS credentials.json file.');
  const absolute = path.resolve(credentialsPath);
  if (process.platform !== 'win32') assert.equal(fs.statSync(absolute).mode & 0o077, 0, 'Restrict credentials.json permissions to its owner before setup (chmod 600).');
  const keystore = JSON.parse(fs.readFileSync(absolute, 'utf8')).android?.keystore;
  assert.ok(keystore, 'Android keystore credentials are missing.');
  const file = path.resolve(path.dirname(absolute), keystore.keystorePath);
  const settings = {
    ...env,
    ANDROID_KEYSTORE_BASE64: fs.readFileSync(file).toString('base64'),
    ANDROID_KEYSTORE_PASSWORD: keystore.keystorePassword,
    ANDROID_KEY_ALIAS: keystore.keyAlias,
    ANDROID_KEY_PASSWORD: keystore.keyPassword,
  };
  const secrets = ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD', 'GOOGLE_MAPS_API_KEY', 'SENTRY_AUTH_TOKEN'];
  const variables = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT'];
  const missing = [...secrets, ...variables].filter(name => !settings[name]?.trim());
  assert.equal(missing.length, 0, `Set required local environment values before setup: ${missing.join(', ')}`);
  const { fingerprint } = require('../apps/partner/scripts/direct-android-release.cjs');
  let details;
  try {
    details = execFileSync('keytool', ['-J-Duser.language=en', '-list', '-v', '-keystore', file,
      '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD', '-alias', settings.ANDROID_KEY_ALIAS], {
      env: settings, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch { throw new Error('Could not verify the upload keystore. Private diagnostics withheld.'); }
  const cert = details.match(/SHA256:\s*([A-Fa-f0-9:]+)/)?.[1];
  assert.equal(fingerprint(cert), publicUploadCert, 'This is not the verified Partner production upload certificate.');
  require('../packages/shared/config/api-url.cjs').validateApiUrl(settings.EXPO_PUBLIC_API_URL, false);
  require('../packages/shared/config/google-maps.cjs').resolveNativeMapKeys({ GOOGLE_MAPS_API_KEY: settings.GOOGLE_MAPS_API_KEY });
  require('../apps/partner/config-monitoring.cjs').validateMonitoringConfig({ ...settings, PARTNER_DIRECT_ANDROID_RELEASE: 'true' });
  // Validate before any mutation; do not leave a partial credential setup.
  const environments = JSON.parse(gh(['api', `repos/${repo}/environments`]));
  const existing = environments.environments.find(item => item.name === environment);
  if (existing) {
    assert.equal(existing.deployment_branch_policy?.custom_branch_policies, true, 'Have an admin review the existing release environment branch restrictions before setup.');
  } else {
    gh(['api', '--method', 'PUT', `repos/${repo}/environments/${environment}`, '--input', '-'],
      JSON.stringify({ deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } }));
  }
  const policies = JSON.parse(gh(['api', `repos/${repo}/environments/${environment}/deployment-branch-policies`]));
  const branch = access.default_branch;
  if (!(policies.branch_policies ?? []).some(policy => policy.name === branch && policy.type === 'branch')) {
    gh(['api', '--method', 'POST', `repos/${repo}/environments/${environment}/deployment-branch-policies`, '--input', '-'],
      JSON.stringify({ name: branch, type: 'branch' }));
  }
  assert.ok((policies.branch_policies ?? []).every(policy => policy.name === branch && policy.type === 'branch'),
    'Existing release environment allows other refs; have an admin review its branch policies before storing credentials.');
  for (const name of secrets) {
    gh(['secret', 'set', name, '--repo', repo, '--env', environment], settings[name]);
    console.log(`Configured secret ${name}.`);
  }
  for (const name of variables) {
    gh(['variable', 'set', name, '--repo', repo, '--env', environment, '--body', settings[name]]);
    console.log(`Configured variable ${name}.`);
  }
  gh(['variable', 'set', 'ANDROID_UPLOAD_CERT_SHA256', '--repo', repo, '--env', environment, '--body', publicUploadCert]);
  console.log(`Configured ${environment}; production build dispatch remains manual.`);
}

if (require.main === module) {
  try { configure(process.argv[2]); }
  catch (error) {
    // keytool/gh errors may contain sensitive arguments. Show only intentional checks.
    console.error((error.code && error.code !== 'ERR_ASSERTION') || !error.message ? 'Release environment setup failed; private diagnostics withheld.' :
      require('../apps/partner/scripts/redact-release-log.cjs').redact(error.message));
    process.exitCode = 1;
  }
}

module.exports = { configure };
