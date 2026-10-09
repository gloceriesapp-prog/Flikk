// Copies production's catalogue and home-screen CONTENT into your local
// database so the local app looks like the real one: categories, sub-
// categories, home tabs/tiles/banners, festival and seasonal sections, FAQs,
// and the product catalogue (products + variants). Image columns keep their
// production URLs, which are public, so every picture loads as in the live app.
//
//   SOURCE_DATABASE_URL='<production session-pooler URI>' npm run local:content
//
// What it never copies: anything personal (users, stores, addresses, orders,
// riders, payouts, support, reviews). Imported products are attached to the
// local test store "Test Kirana Kaup" from `npm run local:setup`, and
// variants without a stock count get 50 so they can be ordered locally.
//
// Safety: the source connection is read-only (default_transaction_read_only),
// and the target must be a local database (refuses the production project).
// Target: DATABASE_URL, or local Supabase's DB from `supabase status`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PRODUCTION_REF = 'bjlknohjdnemxwwoxcsv';
const LOCAL_TEST_STORE = '00000000-0000-4000-a000-000000000201';
const root = fileURLToPath(new URL('../', import.meta.url));
const fail = (message) => { console.error(`\n✗ ${message}`); process.exit(1); };

// Parent tables before children; each re-import replaces rows by primary key.
const TABLES = [
  { name: 'category_sections' },
  { name: 'categories' },
  { name: 'sub_categories' },
  { name: 'home_tabs' },
  // Its audit trigger records each insert in home_content_history; clear the
  // local history for the tabs being replaced so a re-import doesn't collide.
  { name: 'home_content', before: 'DELETE FROM public.home_content_history h USING _s s WHERE h.tab_key = s.tab_key;' },
  { name: 'home_tab_banners' },
  { name: 'home_tab_tiles' },
  { name: 'home_sections' },
  { name: 'seasonal_banner' },
  { name: 'seasonal_tiles' },
  { name: 'festival_greeting' },
  { name: 'festival_sections' },
  { name: 'app_faqs' },
  { name: 'products', overrides: { store_id: `'${LOCAL_TEST_STORE}'::uuid` } },
  { name: 'product_variants', overrides: { stock_quantity: 'coalesce(stock_quantity, 50)' } },
  { name: 'festival_section_products' },
];

const source = process.env.SOURCE_DATABASE_URL;
if (!source) fail("Set SOURCE_DATABASE_URL to production's Session pooler URI (Supabase -> Flikk -> Connect). It is only read.");

let target = process.env.DATABASE_URL;
if (!target) {
  const status = spawnSync('npx', ['--yes', 'supabase', 'status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
  target = status.stdout?.match(/^DB_URL="?([^"\n]+)"?$/m)?.[1];
  if (!target) fail('Local Supabase is not running. Run `npm run local:setup` first, or set DATABASE_URL to the local database.');
}
if (target.includes(PRODUCTION_REF)) fail('The target is the production database. This script only writes to a local database.');
if (target === source) fail('Source and target are the same database.');

function psql(url, args, { input, readOnly = false } = {}) {
  const env = { ...process.env, PGOPTIONS: `-c client_min_messages=warning${readOnly ? ' -c default_transaction_read_only=on' : ''}` };
  const result = spawnSync(process.env.PSQL_BIN ?? 'psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', url, ...args],
    { input, encoding: 'utf8', env, maxBuffer: 256 * 1024 * 1024 });
  if (result.error) fail(`Could not run psql: ${result.error.message}`);
  if (result.status !== 0) fail(`psql failed:\n${result.stderr.trim()}`);
  return result.stdout;
}
const rows = (url, sql, readOnly) => psql(url, ['-At', '-F', '\t', '-c', sql], { readOnly }).split('\n').filter(Boolean).map((l) => l.split('\t'));
const ident = (name) => `"${name.replaceAll('"', '""')}"`;

const columns = (url, table, readOnly) => rows(url, `SELECT column_name, coalesce(is_generated,'NEVER'), coalesce(identity_generation,'') FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' ORDER BY ordinal_position`, readOnly);

if (!rows(target, `SELECT 1 FROM public.stores WHERE id='${LOCAL_TEST_STORE}'`).length) {
  fail('The local test store is missing. Run `npm run local:setup` (it loads the test data) first.');
}

console.log('Copying production content into the local database (production is only read)…');
let total = 0;
for (const { name, overrides = {}, before } of TABLES) {
  const sourceCols = new Set(columns(source, name, true).map(([c]) => c));
  if (!sourceCols.size) { console.log(`  - ${name}: not in production yet, skipped`); continue; }
  const targetCols = columns(target, name);
  if (!targetCols.length) { console.log(`  - ${name}: not in the local schema, skipped`); continue; }
  const cols = targetCols.filter(([c, gen, identity]) => sourceCols.has(c) && gen !== 'ALWAYS' && identity !== 'ALWAYS').map(([c]) => c);
  const select = cols.map((c) => (overrides[c] ? `${overrides[c]} AS ${ident(c)}` : ident(c))).join(', ');
  const data = psql(source, ['-c', `COPY (SELECT ${select} FROM public.${ident(name)}) TO STDOUT`], { readOnly: true });
  const count = data ? data.split('\n').filter(Boolean).length : 0;
  // Rows are upserted on the primary key (children keep their references).
  // Migrations also seed some default rows (e.g. home_sections) under their
  // own ids, so a row that clashes on any OTHER unique key is removed first.
  const keys = rows(target, `SELECT i.indisprimary, string_agg(a.attname, ',' ORDER BY k.ord) FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ord) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE i.indrelid='public.${name}'::regclass AND i.indisunique AND i.indexprs IS NULL AND i.indpred IS NULL GROUP BY i.indexrelid, i.indisprimary`)
    .map(([primary, list]) => ({ primary: primary === 't', cols: list.split(',') })).filter((k) => k.cols.every((c) => cols.includes(c)));
  const pk = keys.find((k) => k.primary)?.cols;
  const eq = (keyCols) => keyCols.map((c) => `t.${ident(c)} = s.${ident(c)}`).join(' AND ');
  const colList = cols.map(ident).join(', ');
  const script = [
    'BEGIN;',
    `CREATE TEMP TABLE _s AS SELECT ${colList} FROM public.${ident(name)} WITH NO DATA;`,
    `COPY _s (${colList}) FROM STDIN;`,
    data + '\\.',
    ...(before ? [before] : []),
    ...(pk
      ? [
          ...keys.filter((k) => !k.primary).map((k) => `DELETE FROM public.${ident(name)} t USING _s s WHERE ${eq(k.cols)} AND NOT (${eq(pk)});`),
          `INSERT INTO public.${ident(name)} (${colList}) SELECT ${colList} FROM _s ON CONFLICT (${pk.map(ident).join(', ')}) DO UPDATE SET ${
            cols.filter((c) => !pk.includes(c)).map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`).join(', ') || `${ident(pk[0])} = EXCLUDED.${ident(pk[0])}`};`,
        ]
      : [`DELETE FROM public.${ident(name)};`, `INSERT INTO public.${ident(name)} (${colList}) SELECT ${colList} FROM _s;`]),
    'COMMIT;',
  ].join('\n');
  psql(target, ['-f', '-'], { input: script });
  total += count;
  console.log(`  ✓ ${name}: ${count} row(s)`);
}
console.log(`\n✓ Copied ${total} content row(s). Images load from production's public storage. Restart the app to see them.`);
