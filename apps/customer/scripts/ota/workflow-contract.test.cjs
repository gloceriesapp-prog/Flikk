/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

test('workflow CLI contracts reject mismatched device evidence before promotion and rehearse/record a compatible rollback', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-workflow-contract-'));
  try {
    const scripts = path.join(root, 'apps/customer/scripts/ota');
    fs.mkdirSync(scripts, { recursive: true });
    for (const file of fs.readdirSync(__dirname).filter(file => file.endsWith('.cjs') && !file.endsWith('.test.cjs'))) {
      fs.copyFileSync(path.join(__dirname, file), path.join(scripts, file));
    }
    fs.writeFileSync(path.join(root, 'apps/customer/native-runtime.json'), JSON.stringify({ ios: 'ios-2', android: 'android-2' }));
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init'); git('config', 'user.name', 'Release test'); git('config', 'user.email', 'test@example.invalid');
    git('add', '.'); git('commit', '-m', 'fixture');
    const commit = git('rev-parse', 'HEAD');
    const guard = require(path.join(scripts, 'native-compatibility.cjs'));
    const { CHECKS, makeDeviceQa } = require(path.join(scripts, 'device-qa.cjs'));
    const group = 'a0000000-0000-4000-8000-000000000001', id = 'b0000000-0000-4000-8000-000000000002';
    const report = { schemaVersion: 1, workflowCommit: commit, sourceCommit: commit, buildCommit: commit,
      platform: 'ios', runtimeVersion: 'ios-2', nativeHash: guard.sourceIdentity(), channel: 'preview', group, updateId: id };
    const run = { id: 101, path: '.github/workflows/customer-ota.yml', event: 'workflow_dispatch', conclusion: 'success', head_branch: 'main', head_sha: commit };
    const qaRun = { ...run, id: 301, path: '.github/workflows/customer-ota-verify.yml' };
    const qaInput = { platform: 'ios', previewRunId: '101', updateId: id, runtimeVersion: 'ios-2',
      deviceModel: 'iPhone 16', checks: CHECKS, confirmed: 'true', workflowCommit: commit };
    const save = (name, value) => { const file = path.join(root, name); fs.writeFileSync(file, JSON.stringify(value)); return file; };
    const env = { PATH: process.env.PATH, GITHUB_SHA: commit, OTA_PLATFORM: 'ios', OTA_NATIVE_BUILD_COMMIT: commit,
      OTA_PREVIEW_ID: '101', OTA_PREVIEW_REPORT: save('preview.json', report), OTA_PREVIEW_RUN: save('preview-run.json', run),
      OTA_QA_REPORT: save('qa.json', makeDeviceQa(report, run, qaInput)), OTA_QA_RUN: save('qa-run.json', qaRun),
      GITHUB_OUTPUT: path.join(root, 'outputs'), OTA_REPORT: path.join(root, 'out.json') };
    const call = (script, command, overrides = {}) => spawnSync(process.execPath, [path.join(scripts, script), command],
      { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8' });
    let result = call('update-report.cjs', 'validate-preview');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.readFileSync(env.GITHUB_OUTPUT, 'utf8').includes(`group=${group}`));
    const qa = JSON.parse(fs.readFileSync(env.OTA_QA_REPORT));
    save('qa.json', { ...qa, updateId: group });
    assert.notEqual(call('update-report.cjs', 'validate-preview').status, 0);

    const target = { ...report, channel: 'production' };
    const rehearsal = { ...report, operation: 'rollback', targetRunId: '101', targetGroup: group };
    const rehearsalRun = { ...run, id: 201, path: '.github/workflows/customer-ota-rollback.yml' };
    save('preview.json', rehearsal); save('preview-run.json', rehearsalRun);
    save('qa.json', makeDeviceQa(rehearsal, rehearsalRun, { ...qaInput, previewRunId: '201' }));
    const rollbackEnv = { OTA_CHANNEL: 'production', OTA_TARGET_ID: '101', OTA_PREVIEW_ID: '201',
      OTA_TARGET_REPORT: save('target.json', target), OTA_TARGET_RUN: save('target-run.json', run) };
    result = call('rollback.cjs', 'prepare', rollbackEnv);
    assert.equal(result.status, 0, result.stderr);
    const published = [{ platform: 'ios', runtimeVersion: 'ios-2', group: id, id: group }];
    result = call('rollback.cjs', 'record', { ...rollbackEnv, OTA_RESULT: save('provider-result.json', published) });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(env.OTA_REPORT)), { ...rehearsal, channel: 'production', group: id,
      updateId: group, targetGroup: group, targetRunId: '101' });
    save('preview.json', { ...rehearsal, targetGroup: id });
    assert.notEqual(call('rollback.cjs', 'prepare', rollbackEnv).status, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
