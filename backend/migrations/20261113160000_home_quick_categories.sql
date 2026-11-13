-- Separate Home shortcut presentation from tab/catalogue visibility.
-- NULL preserves legacy shortcut visibility and ordering until explicitly edited.
ALTER TABLE public.home_tabs
  ADD COLUMN IF NOT EXISTS show_in_quick_categories boolean,
  ADD COLUMN IF NOT EXISTS quick_sort_order integer CHECK (quick_sort_order BETWEEN 0 AND 9999),
  ADD COLUMN IF NOT EXISTS quick_destination_type text CHECK (quick_destination_type IN ('category', 'subcategory')),
  ADD COLUMN IF NOT EXISTS quick_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quick_subcategory_id uuid REFERENCES public.sub_categories(id) ON DELETE SET NULL;
ALTER TABLE public.home_tabs ADD CONSTRAINT home_tabs_one_quick_destination
  CHECK (quick_category_id IS NULL OR quick_subcategory_id IS NULL);
COMMENT ON COLUMN public.home_tabs.show_in_quick_categories IS
  'Home shortcut only; NULL preserves legacy visibility. Does not hide the Home tab or catalogue category.';
-- Retain the destination kind when FK deletion clears its ID, allowing the
-- public reader to hide a broken shortcut rather than open an unrelated tab.
