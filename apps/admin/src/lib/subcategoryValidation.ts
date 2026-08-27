// Sub-category write-path validation + row mapping — used by
// app/api/subcategories/route.ts (POST) and .../[id]/route.ts (PATCH),
// same "one place, not two copies" pattern as lib/categoryValidation.ts.

export interface SubCategoryWriteInput {
  categoryId: string;
  name: string;
  sortOrder?: number;
}

export function validateSubCategoryInput(input: Partial<SubCategoryWriteInput>): asserts input is SubCategoryWriteInput {
  if (!input.categoryId) throw new Error('categoryId is required.');
  if (!input.name || !input.name.trim()) throw new Error('Sub-category name is required.');
}

export interface SubCategoryRow {
  category_id: string;
  name: string;
  sort_order: number;
}

export function toSubCategoryRow(input: SubCategoryWriteInput): SubCategoryRow {
  return {
    category_id: input.categoryId,
    name: input.name.trim(),
    sort_order: input.sortOrder ?? 0,
  };
}
