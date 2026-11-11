const assert = require('node:assert/strict');
const fs = require('node:fs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[a-f0-9]{40}$/;
const CHECKS = ['launch-login', 'home-maps', 'cart-checkout', 'payment-return', 'tracking-resume'];
function verifyRun(run, expectedPath, commit) {
  assert.equal(run.path, expectedPath, 'Unexpected evidence workflow.');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.conclusion, 'success', 'Evidence workflow must finish successfully.');
  assert.equal(run.head_branch, 'main');
  assert.match(commit || '', SHA);
  assert.equal(run.head_sha, commit, 'Evidence workflow source mismatch.');
}
function previewRecord(report, run, platform) {
  assert.ok(['.github/workflows/customer-ota.yml', '.github/workflows/customer-ota-rollback.yml'].includes(run.path));
  verifyRun(run, run.path, report.workflowCommit || report.sourceCommit);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.channel, 'preview');
  assert.equal(report.platform, platform);
  assert.match(report.updateId || '', UUID, 'Preview must record an exact Expo update ID.');
  assert.match(report.group || '', UUID);
  assert.match(report.sourceCommit || '', SHA);
  assert.ok(typeof report.runtimeVersion === 'string' && report.runtimeVersion.length > 0);
}
function makeDeviceQa(report, run, input) {
  previewRecord(report, run, input.platform);
  assert.equal(input.confirmed, 'true', 'Confirm physical-device testing first.');
  assert.match(input.previewRunId || '', /^[1-9][0-9]*$/);
  assert.equal(String(run.id), input.previewRunId);
  assert.equal(input.updateId, report.updateId, 'Installed update does not match this preview.');
  assert.equal(input.runtimeVersion, report.runtimeVersion, 'Installed native runtime does not match.');
  assert.ok(typeof input.deviceModel === 'string' && /^[a-zA-Z0-9 ._()+-]{2,80}$/.test(input.deviceModel), 'Use a model label without personal/device identifiers.');
  assert.ok(Array.isArray(input.checks), 'Provide the completed device-check list as a JSON array.');
  assert.deepEqual([...input.checks].sort(), [...CHECKS].sort(), 'Complete every required device test.');
  assert.match(input.workflowCommit || '', SHA);
  return { schemaVersion: 1, workflowCommit: input.workflowCommit, previewRunId: input.previewRunId,
    platform: report.platform, sourceCommit: report.sourceCommit, buildCommit: report.buildCommit,
    nativeHash: report.nativeHash, runtimeVersion: report.runtimeVersion, updateId: report.updateId,
    group: report.group, deviceModel: input.deviceModel, checks: [...CHECKS], verifiedAt: new Date().toISOString() };
}
function validateDeviceQa(qa, run, preview, previewRunId) {
  verifyRun(run, '.github/workflows/customer-ota-verify.yml', qa.workflowCommit);
  assert.equal(qa.schemaVersion, 1);
  assert.equal(qa.previewRunId, String(previewRunId));
  for (const key of ['platform', 'sourceCommit', 'buildCommit', 'nativeHash', 'runtimeVersion', 'updateId', 'group']) {
    assert.equal(qa[key], preview[key], `Device QA ${key} mismatch.`);
  }
  assert.deepEqual(qa.checks, CHECKS);
  return true;
}
if (require.main === module) {
  try {
    const report = JSON.parse(fs.readFileSync(process.env.OTA_PREVIEW_REPORT));
    const run = JSON.parse(fs.readFileSync(process.env.OTA_PREVIEW_RUN));
    const qa = makeDeviceQa(report, run, { platform: process.env.OTA_PLATFORM,
      previewRunId: process.env.QA_PREVIEW_ID, updateId: process.env.QA_UPDATE_ID,
      runtimeVersion: process.env.QA_RUNTIME, deviceModel: process.env.QA_DEVICE_MODEL,
      checks: JSON.parse(process.env.QA_CHECKS || '[]'), confirmed: process.env.QA_CONFIRMED,
      workflowCommit: process.env.GITHUB_SHA });
    fs.writeFileSync(process.env.OTA_QA_REPORT, JSON.stringify(qa, null, 2) + '\n');
    console.log('Exact-preview physical-device test evidence recorded.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { CHECKS, verifyRun, previewRecord, makeDeviceQa, validateDeviceQa };
