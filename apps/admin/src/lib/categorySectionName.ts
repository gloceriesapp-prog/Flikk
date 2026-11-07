// A category-section title ("Groceries & Cooking"): the heading categories
// show under on the customer app. Shared by add and rename so both refuse the
// same things: blank, over 40 characters, or a name another title already
// uses (case-insensitive, so "Snacks" and "snacks" can't both exist).

export const MAX_SECTION_NAME = 40;

export function cleanSectionName(raw: unknown, existing: { id: string; name: string }[], selfId?: string): string {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new Error('Title is required.');
  if (name.length > MAX_SECTION_NAME) throw new Error(`Title must be ${MAX_SECTION_NAME} characters or fewer.`);
  const taken = existing.some((s) => s.id !== selfId && s.name.trim().toLowerCase() === name.toLowerCase());
  if (taken) throw new Error(`A title named "${name}" already exists.`);
  return name;
}
