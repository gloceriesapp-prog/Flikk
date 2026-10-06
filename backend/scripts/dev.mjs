import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
try { process.loadEnvFile('.env.local'); }
catch (error) { console.error(`Could not load backend/.env.local (${error.code ?? 'invalid file'}).`); process.exit(1); }
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
await mkdir('.dev-runtime', { recursive: true });
const path = `.dev-runtime/${port}.json`;
const nonce = randomUUID();
// Ownership stays with the watcher launcher across child hot reloads.
async function acquire(retries = 3) {
  try {
    const handle = await open(path, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ pid: process.pid, nonce })); }
    finally { await handle.close(); }
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let owner;
    try { owner = JSON.parse(await readFile(path, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT' && retries) return acquire(retries - 1);
      throw new Error('Development startup is in progress, or its lock needs review.');
    }
    if (!Number.isInteger(owner.pid) || owner.pid <= 0 || typeof owner.nonce !== 'string') throw new Error('Invalid development lock; review .dev-runtime before restarting.');
    try { process.kill(owner.pid, 0); }
    catch (error) {
      if (error.code !== 'ESRCH') throw error;
      if (!retries) throw new Error('Another development startup is in progress.');
      try {
        if (JSON.parse(await readFile(path, 'utf8')).nonce === owner.nonce) await unlink(path);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      return acquire(retries - 1);
    }
    console.log(`Development watcher already running (PID ${owner.pid}, port ${port}). Reuse its terminal.`);
    return false;
  }
}
async function release() {
  try { if (JSON.parse(await readFile(path, 'utf8')).nonce === nonce) await unlink(path); }
  catch (error) { if (error.code !== 'ENOENT') console.error('Could not release development lock.'); }
}
async function probeHost(host) {
  const probe = createServer();
  return new Promise((resolve, reject) => {
    probe.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    probe.listen(port, host, () => probe.close(error => error ? reject(error) : resolve(true)));
  });
}
async function portAvailable() {
  if (!await probeHost('0.0.0.0')) return false;
  try { return await probeHost('::'); }
  catch (error) { if (error.code === 'EAFNOSUPPORT') return true; throw error; }
}

try {
  if (!await acquire()) process.exit(0);
  if (!await portAvailable()) {
    let isBackend = false;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
      isBackend = response.ok && (await response.json()).service === 'gloceries-backend';
    } catch { /* Unknown listeners stay untouched. */ }
    console[isBackend ? 'log' : 'error'](isBackend
      ? `Gloceries backend is already running on port ${port}. Reuse it; no second server or jobs were started. Stop it in its terminal if you need to restart.`
      : `Port ${port} is occupied by another process. Inspect it with lsof -nP -iTCP:${port} -sTCP:LISTEN and stop it in its own terminal before retrying.`);
    process.exitCode = isBackend ? 0 : 1;
    await release();
  } else {
    const require = createRequire(import.meta.url);
    const child = spawn(process.execPath, [require.resolve('tsx/cli'), 'watch', '--env-file=.env.local', 'src/index.ts'], { cwd: root, stdio: 'inherit', detached: process.platform !== 'win32' });
    let stopping = false;
    let deadline;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      const signalTree = signal => {
        try {
          if (process.platform === 'win32') child.kill(signal);
          else process.kill(-child.pid, signal); // Only our own detached process group.
        } catch (error) { if (error.code !== 'ESRCH') console.error(`Could not signal watcher: ${error.message}`); }
      };
      signalTree('SIGTERM');
      deadline = setTimeout(async () => {
        console.error('Development watcher did not stop in time; stopping the managed process group.');
        signalTree('SIGKILL');
        await release();
        process.exit(1);
      }, 20000);
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.once('error', async error => { console.error(`Could not start watcher: ${error.message}`); await release(); process.exitCode = 1; });
    child.once('exit', async code => {
      clearTimeout(deadline);
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      await release();
      process.exitCode = stopping ? 0 : code ?? 1;
    });
  }
} catch (error) {
  console.error(`Backend development startup failed: ${error.message}`);
  await release();
  process.exitCode = 1;
}
