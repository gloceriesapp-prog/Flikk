const assert = require('node:assert/strict');
const fs = require('node:fs');
const { validateDeviceQa } = require('./device-qa.cjs');
const { checkCompatibility, runtimeAt } = require('./native-compatibility.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUpdates(updates, platform, runtime) {
  assert.ok(Array.isArray(updates) && updates.length === 1, 'Expected exactly one platform update.');
  const update = updates[0];
  assert.equal(update.platform, platform, 'Update platform mismatch.');
  assert.equal(update.runtimeVersion, runtime, 'Published runtime differs from the native build.');
  assert.match(update.group || '', UUID, 'Missing Expo update group.');
  assert.match(update.id || '', UUID, 'Missing Expo platform update ID.');
  return update.group;
}
function validatePreview(report, run, expected) {
  assert.equal(run.path, '.github/workflows/customer-ota.yml');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.conclusion, 'success');
  assert.equal(run.head_branch, 'main');
  assert.equal(run.head_sha, expected.sourceCommit);
  assert.equal(report.schemaVersion, 1);
  for (const key of ['platform', 'sourceCommit', 'buildCommit', 'nativeHash', 'runtimeVersion']) {
    assert.equal(report[key], expected[key], `Preview ${key} mismatch.`);
  }
  assert.equal(report.channel, 'preview');
  assert.match(report.group || '', UUID);
  assert.match(report.updateId || '', UUID);
  return report.group;
}
if (require.main === module) {
  try {
    const platform = process.env.OTA_PLATFORM;
    assert.ok(['android', 'ios'].includes(platform), 'Select one supported platform.');
    const identity = checkCompatibility(process.env.OTA_NATIVE_BUILD_COMMIT);
    const runtimeVersion = runtimeAt(identity.sourceCommit, platform);
    assert.notEqual(runtimeVersion, 'legacy-runtime', 'Build the new native baseline before OTA.');
    const expected = { ...identity, platform, runtimeVersion };
    if (process.argv[2] === 'validate-preview') {
      const group = validatePreview(JSON.parse(fs.readFileSync(process.env.OTA_PREVIEW_REPORT)),
        JSON.parse(fs.readFileSync(process.env.OTA_PREVIEW_RUN)), expected);
      validateDeviceQa(JSON.parse(fs.readFileSync(process.env.OTA_QA_REPORT)),
        JSON.parse(fs.readFileSync(process.env.OTA_QA_RUN)),
        JSON.parse(fs.readFileSync(process.env.OTA_PREVIEW_REPORT)), process.env.OTA_PREVIEW_ID);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `group=${group}\n`);
    } else {
      const updates = JSON.parse(fs.readFileSync(process.env.OTA_RESULT));
      const group = validateUpdates(updates, platform, runtimeVersion);
      fs.writeFileSync(process.env.OTA_REPORT, JSON.stringify({ ...expected, workflowCommit: process.env.GITHUB_SHA, channel: process.env.OTA_CHANNEL, group, updateId: updates[0].id }, null, 2) + '\n');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateUpdates, validatePreview };
