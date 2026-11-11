const assert = require('node:assert/strict');
const fs = require('node:fs');
const { verifyRun, validateDeviceQa } = require('./device-qa.cjs');
const { sourceIdentity, runtimeAt } = require('./native-compatibility.cjs');
const { validateUpdates } = require('./update-report.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateTarget(report, run, expected) {
  verifyRun(run, '.github/workflows/customer-ota.yml', report.workflowCommit || report.sourceCommit);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.platform, expected.platform);
  assert.equal(String(run.id), expected.targetRunId);
  assert.ok(['preview', 'production'].includes(report.channel));
  if (expected.channel === 'production') assert.equal(report.channel, 'production', 'Production rollback requires a previously published production target.');
  assert.equal(report.nativeHash, expected.nativeHash, 'Rollback target is incompatible with the installed native build.');
  assert.equal(report.runtimeVersion, expected.runtimeVersion);
  assert.match(report.group || '', UUID);
  assert.match(report.updateId || '', UUID);
  return report.group;
}
function validateRollbackPreview(report, run, target, targetRunId) {
  verifyRun(run, '.github/workflows/customer-ota-rollback.yml', report.workflowCommit);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.channel, 'preview');
  assert.equal(report.operation, 'rollback');
  assert.equal(report.targetRunId, targetRunId);
  assert.equal(report.targetGroup, target.group);
  for (const key of ['sourceCommit', 'platform', 'runtimeVersion', 'nativeHash']) assert.equal(report[key], target[key]);
  assert.match(report.updateId || '', UUID);
  assert.match(report.group || '', UUID);
}
const read = name => JSON.parse(fs.readFileSync(process.env[name]));
if (require.main === module) {
  try {
    const platform = process.env.OTA_PLATFORM;
    const base = process.env.OTA_NATIVE_BUILD_COMMIT;
    assert.match(base || '', /^[a-f0-9]{40}$/);
    assert.ok(['preview', 'production'].includes(process.env.OTA_CHANNEL));
    const target = read('OTA_TARGET_REPORT');
    const expected = { platform, channel: process.env.OTA_CHANNEL, targetRunId: process.env.OTA_TARGET_ID,
      nativeHash: sourceIdentity(base), runtimeVersion: runtimeAt(base, platform) };
    const group = validateTarget(target, read('OTA_TARGET_RUN'), expected);
    if (process.argv[2] === 'prepare') {
      if (expected.channel === 'production') {
        const preview = read('OTA_PREVIEW_REPORT');
        validateRollbackPreview(preview, read('OTA_PREVIEW_RUN'), target, expected.targetRunId);
        validateDeviceQa(read('OTA_QA_REPORT'), read('OTA_QA_RUN'), preview, process.env.OTA_PREVIEW_ID);
      }
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `group=${group}\n`);
    } else {
      const updates = read('OTA_RESULT');
      const publishedGroup = validateUpdates(updates, platform, expected.runtimeVersion);
      fs.writeFileSync(process.env.OTA_REPORT, JSON.stringify({ schemaVersion: 1, operation: 'rollback',
        workflowCommit: process.env.GITHUB_SHA, sourceCommit: target.sourceCommit, buildCommit: base,
        nativeHash: expected.nativeHash, runtimeVersion: expected.runtimeVersion, platform,
        channel: expected.channel, targetRunId: expected.targetRunId, targetGroup: group,
        group: publishedGroup, updateId: updates[0].id }, null, 2) + '\n');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateTarget, validateRollbackPreview };
