// Product/flavour suggestions only. Category and store browsing belongs to
// their own screens, not the item-search results.
export type TypeaheadSuggestion = { kind: 'product'; label: string };

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
  productNames: string[],
): TypeaheadSuggestion[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return ranked(productNames.map((label) => ({ kind: 'product' as const, label })), needle, MAX_PRODUCTS);
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
