const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CHECKS, makeDeviceQa, validateDeviceQa } = require('./device-qa.cjs');
const { validateTarget, validateRollbackPreview } = require('./rollback.cjs');
const commit = 'a'.repeat(40), workflowCommit = 'b'.repeat(40);
const group = 'a0000000-0000-4000-8000-000000000001', updateId = 'b0000000-0000-4000-8000-000000000002';
const preview = { schemaVersion: 1, workflowCommit: commit, sourceCommit: commit,
  buildCommit: 'c'.repeat(40), nativeHash: 'd'.repeat(64), platform: 'ios', runtimeVersion: 'ios-native-2',
  channel: 'preview', group, updateId };
const previewRun = { id: 101, path: '.github/workflows/customer-ota.yml', event: 'workflow_dispatch', conclusion: 'success', head_branch: 'main', head_sha: commit };
const input = { platform: 'ios', previewRunId: '101', updateId, runtimeVersion: preview.runtimeVersion,
  deviceModel: 'iPhone 16', checks: CHECKS, confirmed: 'true', workflowCommit };
const qaRun = { path: '.github/workflows/customer-ota-verify.yml', event: 'workflow_dispatch', conclusion: 'success', head_branch: 'main', head_sha: workflowCommit };

test('device evidence requires the exact installed preview and all physical checks', () => {
  const qa = makeDeviceQa(preview, previewRun, input);
  assert.equal(validateDeviceQa(qa, qaRun, preview, '101'), true);
  for (const bad of [{ platform: 'android' }, { updateId: group }, { runtimeVersion: 'wrong' }, { previewRunId: '999' },
    { checks: CHECKS.slice(0, 4) }, { confirmed: 'false' }, { deviceModel: 'name@example.com' }]) {
    assert.throws(() => makeDeviceQa(preview, previewRun, { ...input, ...bad }));
  }
  assert.throws(() => validateDeviceQa(qa, { ...qaRun, conclusion: 'failure' }, preview, '101'));
  assert.throws(() => validateDeviceQa(qa, qaRun, { ...preview, updateId: group }, '101'));
  assert.throws(() => validateDeviceQa(qa, qaRun, preview, '102'));
});
test('rollback targets must be verified releases compatible with the installed native runtime', () => {
  const target = { ...preview, channel: 'production' };
  const expected = { platform: 'ios', channel: 'production', targetRunId: '101', nativeHash: target.nativeHash, runtimeVersion: target.runtimeVersion };
  assert.equal(validateTarget(target, previewRun, expected), group);
  for (const bad of [{ nativeHash: 'wrong' }, { platform: 'android' }, { runtimeVersion: 'old' }, { targetRunId: '999' }]) {
    assert.throws(() => validateTarget(target, previewRun, { ...expected, ...bad }));
  }
  assert.throws(() => validateTarget(preview, previewRun, expected));
  assert.throws(() => validateTarget(target, { ...previewRun, path: '.github/workflows/untrusted.yml' }, expected));
});
test('production rollback requires a matching preview rehearsal and exact-device QA', () => {
  const target = { ...preview, channel: 'production' };
  const rehearsal = { ...preview, workflowCommit, operation: 'rollback', targetRunId: '101', targetGroup: group };
  const run = { ...previewRun, id: 201, path: '.github/workflows/customer-ota-rollback.yml', head_sha: workflowCommit };
  validateRollbackPreview(rehearsal, run, target, '101');
  const qa = makeDeviceQa(rehearsal, run, { ...input, previewRunId: '201' });
  validateDeviceQa(qa, qaRun, rehearsal, '201');
  for (const bad of [{ targetRunId: '999' }, { targetGroup: updateId }, { operation: 'release' }, { channel: 'production' }]) {
    assert.throws(() => validateRollbackPreview({ ...rehearsal, ...bad }, run, target, '101'));
  }
});

test('iOS archive policy rejects startup waits, wrong channels and mismatched runtimes', () => {
  const { verifyIosUpdatePolicy } = require('./native-policy.cjs');
  const plist = { EXUpdatesCheckOnLaunch: 'ERROR_RECOVERY_ONLY', EXUpdatesLaunchWaitMs: 0,
    EXUpdatesRuntimeVersion: 'ios-2', EXUpdatesURL: 'https://u.expo.dev/a98e9f05-620b-4efb-8624-99d724667e7c',
    EXUpdatesRequestHeaders: { 'expo-channel-name': 'preview' } };
  verifyIosUpdatePolicy(plist, 'ios-2', 'preview');
  for (const bad of [{ EXUpdatesCheckOnLaunch: 'ALWAYS' }, { EXUpdatesLaunchWaitMs: 30000 },
    { EXUpdatesRuntimeVersion: 'wrong' }, { EXUpdatesRequestHeaders: { 'expo-channel-name': 'production' } }]) {
    assert.throws(() => verifyIosUpdatePolicy({ ...plist, ...bad }, 'ios-2', 'preview'));
  }
});
