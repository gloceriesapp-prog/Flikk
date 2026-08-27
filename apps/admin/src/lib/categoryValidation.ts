// Categories write-path validation + row mapping — used by both
// app/api/categories/route.ts (POST) and app/api/categories/[id]/route.ts
// (PATCH), same "one place, not two copies that can drift" pattern as
// lib/productValidation.ts/lib/storeValidation.ts.

export interface CategoryWriteInput {
  name: string;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  // Which title/group this shows under on the customer app's grouped
  // Categories grid — required, not optional: a category with no section
  // has nowhere to render there (categorySectionsRouter only groups
  // categories that have one).
  sectionId: string;
}

export function validateCategoryInput(input: Partial<CategoryWriteInput>): asserts input is CategoryWriteInput {
  if (!input.name || !input.name.trim()) throw new Error('Category name is required.');
  if (!input.sectionId) throw new Error('A title is required — pick which section this category belongs under.');
}

export interface CategoryRow {
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  section_id: string;
}

export function toCategoryRow(input: CategoryWriteInput): CategoryRow {
  return {
    name: input.name.trim(),
    image_url: input.imageUrl?.trim() || null,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    section_id: input.sectionId,
  };
}

// Supabase's PostgrestError isn't an Error instance (plain object with its
// own code/message), so a plain `err instanceof Error` check always misses
// it and falls through to a generic fallback — that was making the
// (section_id, name) unique-index clash below read as an unhelpful mystery
// failure. 23505 is Postgres's own unique-violation code; a category name
// only has to be unique within its own title, not globally, so this is
// specifically "that name's already used under this title," not anything
// else that could throw here.
export function toCategoryErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === '23505') {
    return 'A category with this name already exists under that title — pick a different name.';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
