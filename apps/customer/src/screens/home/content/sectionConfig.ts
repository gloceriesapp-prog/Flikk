import { isHomeProductLayout } from '../../../../../../packages/home-content/sectionLayout.js';
import type { HomeSectionConfig } from '../useHomeSections';

// Reject an unusable response so React Query retains the last known-good layout.
// Unknown section keys remain safe: the renderer ignores unsupported sections.
export function parseHomeSections(value: unknown): HomeSectionConfig[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid Home layout response.');
  const seen = new Set<string>();
  return value.map((row: unknown) => {
    if (!row || typeof row !== 'object') throw new Error('Invalid Home section.');
    const s = row as Record<string, unknown>;
    if (typeof s.key !== 'string' || !/^[a-z0-9-]{1,80}$/.test(s.key) || seen.has(s.key)
      || typeof s.enabled !== 'boolean' || !Number.isSafeInteger(s.sortIndex)) throw new Error('Invalid Home section.');
    seen.add(s.key);
    const text = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 200) || null : null;
    let bannerImageUrl: string | null = null;
    if (typeof s.bannerImageUrl === 'string' && s.bannerImageUrl.length <= 2048) {
      try {
        const url = new URL(s.bannerImageUrl);
        if (url.protocol === 'https:' && !url.username && !url.password) bannerImageUrl = url.href;
      } catch { /* Invalid optional artwork falls back without losing the shelf. */ }
    }
    return { key: s.key, title: text(s.title), subtitle: text(s.subtitle), enabled: s.enabled,
      sortIndex: s.sortIndex as number, bgColor: typeof s.bgColor === 'string' && /^#[0-9a-f]{6}$/i.test(s.bgColor) ? s.bgColor : null,
      bannerImageUrl, custom: s.custom === true, pinnedOnly: s.pinnedOnly === true,
      ...(s.displayLayout === undefined ? {} : { displayLayout: isHomeProductLayout(s.displayLayout) ? s.displayLayout : null }),
    };
  });
}
