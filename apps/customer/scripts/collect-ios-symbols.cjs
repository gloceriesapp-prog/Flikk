// Preserve vendor symbols; never generate placeholder dSYMs for stripped binaries.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function parseUUIDs(output) {
  return [...output.matchAll(/^UUID: ([A-Fa-f0-9-]{36}) \(([^)]+)\)/gm)]
    .map((match) => ({ uuid: match[1].toUpperCase(), arch: match[2] }));
}
function covers(required, candidate) {
  return required.length > 0 && required.every(a => candidate.some(b => a.uuid === b.uuid && a.arch === b.arch));
}
function uuidFor(file) {
  return parseUUIDs(execFileSync('xcrun', ['dwarfdump', '--uuid', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
}
function findBundles(roots) {
  const seen = new Set(); const bundles = [];
  function visit(entry) {
    if (!fs.existsSync(entry)) return;
    const real = fs.realpathSync(entry);
    if (seen.has(real)) return;
    seen.add(real);
    if (!fs.statSync(real).isDirectory()) return;
    if (entry.endsWith('.dSYM')) { bundles.push(real); return; }
    for (const child of fs.readdirSync(real)) visit(path.join(real, child));
  }
  roots.forEach(visit);
  return bundles;
}
function collectSymbols(archive, roots, copy = false) {
  const apps = fs.readdirSync(path.join(archive, 'Products/Applications')).filter(n => n.endsWith('.app'));
  if (apps.length !== 1) throw new Error('Expected exactly one archived application');
  const frameworks = path.join(archive, 'Products/Applications', apps[0], 'Frameworks');
  const destination = path.join(archive, 'dSYMs');
  const candidates = findBundles([destination, ...roots]);
  const result = [];
  for (const name of fs.readdirSync(frameworks).filter(n => n.endsWith('.framework'))) {
    const required = uuidFor(path.join(frameworks, name, name.slice(0, -10)));
    const target = path.join(destination, `${name}.dSYM`);
    if (fs.existsSync(target) && covers(required, uuidFor(target))) {
      result.push({ framework: name, status: 'present' }); continue;
    }
    const source = candidates.find(p => path.basename(p) === `${name}.dSYM` && covers(required, uuidFor(p)));
    if (!source) { result.push({ framework: name, status: 'missing', required }); continue; }
    if (copy) {
      // A different UUID in the archive indicates a bad archive; do not overwrite it.
      if (fs.existsSync(target)) throw new Error(`Mismatched archived symbols: ${name}`);
      fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
      if (!covers(required, uuidFor(target))) throw new Error(`Copied symbol verification failed: ${name}`);
    }
    result.push({ framework: name, status: copy ? 'copied' : 'available', source });
  }
  return result;
}
if (require.main === module) {
  const args = process.argv.slice(2); let archive; const roots = []; let copy = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--archive') archive = args[++i];
    else if (args[i] === '--search-root') roots.push(args[++i]);
    else if (args[i] === '--copy') copy = true;
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  if (!archive) throw new Error('Usage: --archive <xcarchive> [--search-root <directory>] [--copy]');
  const results = collectSymbols(path.resolve(archive), roots.map(p => path.resolve(p)), copy);
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => r.status === 'missing')) process.exitCode = 1;
}
module.exports = { parseUUIDs, covers, findBundles, collectSymbols };
