// Every App content copy key the admin can edit must be read by the customer
// app (packages/home-content/copyKeys.js is the shared registry). Home "All"
// section headings are resolved dynamically from the section key
// (AllTabSections.tsx copyPrefix), so those count as read when the section
// exists in its SECTION_REGISTRY.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { COPY_KEYS } from '../../../packages/home-content/copyKeys.js';

const customerSrc = fileURLToPath(new URL('../../../apps/customer/src', import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [readFileSync(path, 'utf8')] : [];
  });
}

it('every registered copy key is read by the customer app', () => {
  const code = sources(customerSrc).join('\n');
  const allTab = readFileSync(join(customerSrc, 'screens/home/sections/AllTabSections.tsx'), 'utf8');
  const sectionKeys = new Set([...allTab.matchAll(/^ {2}'([a-z-]+)': \(/gm)].map((m) => m[1]));
  const camel = (key: string) => key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const dynamic = new Set([...sectionKeys].flatMap((key) => [`home.${camel(key)}.title`, `home.${camel(key)}.subtitle`]));
  const unread = Object.keys(COPY_KEYS).filter((key) => !dynamic.has(key) && !code.includes(`'${key}'`));
  expect(sectionKeys.size).toBeGreaterThan(5);
  expect(unread).toEqual([]);
});
