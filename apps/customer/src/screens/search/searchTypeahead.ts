// Text suggestions while typing (SearchTypeahead.tsx): matching categories
// first (they open the category), then distinct product names from the live
// search results (they run that search). A name matches when one of its words
// starts with the typed text ("ri" -> Rice, not Bisleri); names starting with
// it rank first. Mid-word matches are used only when nothing else matches. No
// extra request: categories are the cached /category-sections list and
// products are useProductSearch's results.

export type TypeaheadSuggestion =
  | { kind: 'category'; id: string; label: string }
  | { kind: 'product'; label: string };

const MAX_CATEGORIES = 3;
const MAX_PRODUCTS = 6;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Index of the first word in `name` starting with `needle`, else -1.
function wordStart(name: string, needle: string): number {
  return name.search(new RegExp(`(^|[^a-z0-9])${escape(needle)}`)) === -1 ? -1
    : name.startsWith(needle) ? 0 : name.search(new RegExp(`[^a-z0-9]${escape(needle)}`)) + 1;
}

function ranked<T extends { label: string }>(items: T[], needle: string, limit: number): T[] {
  const seen = new Set<string>();
  const starts: T[] = [];
  const words: T[] = [];
  const inside: T[] = [];
  for (const item of items) {
    const name = item.label.trim().toLowerCase();
    if (!name.includes(needle) || seen.has(name)) continue;
    seen.add(name);
    const at = wordStart(name, needle);
    (at === 0 ? starts : at > 0 ? words : inside).push(item);
  }
  const best = [...starts, ...words];
  return (best.length > 0 ? best : inside).slice(0, limit);
}

export function buildSuggestions(
  query: string,
  categories: { id: string; name: string }[],
  productNames: string[],
): TypeaheadSuggestion[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return [
    ...ranked(categories.map((c) => ({ kind: 'category' as const, id: c.id, label: c.name })), needle, MAX_CATEGORIES),
    ...ranked(productNames.map((label) => ({ kind: 'product' as const, label })), needle, MAX_PRODUCTS),
  ];
}

// "Daawat Rice" + "ri" -> ['Daawat ', 'Ri', 'ce'] so the typed part can be
// bold: the word-start occurrence when there is one.
export function splitMatch(label: string, query: string): [string, string, string] {
  const needle = query.trim().toLowerCase();
  const lower = label.toLowerCase();
  if (!needle) return [label, '', ''];
  const word = wordStart(lower, needle);
  const at = word >= 0 ? word : lower.indexOf(needle);
  if (at < 0) return [label, '', ''];
  const end = at + needle.length;
  return [label.slice(0, at), label.slice(at, end), label.slice(end)];
}
