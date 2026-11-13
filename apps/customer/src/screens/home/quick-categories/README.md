# Home Quick categories

Admin → Customer Home → **Quick categories & tabs**:

1. Select an existing Home category or use **Add Home category** for a custom name.
2. Upload its card image. This does not rename or re-image catalogue categories.
3. In **Home Quick category**, choose Show/Hide, optional display order, and what the card opens.
4. Choose an existing category/subcategory to show its real, currently available products. For a custom Home collection, keep **Open this Home category** and link a catalogue section or configure category tiles below.
5. Save Quick category. Existing content-cache invalidation/foreground refresh brings the change to compatible customer apps.

Visibility and order affect only Home Quick shortcuts. Home tab visibility and catalogue categories remain separate. Lower order values appear first; ties retain existing tab order. Blank order and “Use existing visibility” preserve previous behavior, including App content’s legacy hidden-name list. Explicit Show/Hide overrides that legacy list.

Inactive/deleted direct targets are hidden instead of opening a different product list. Direct subcategory links select that subcategory immediately rather than briefly showing all parent-category products. Product, stock, location, closed-store browsing and checkout eligibility continue through the existing catalogue APIs.

## Deployment

Apply `20261113160000_home_quick_categories.sql` before deploying the Admin/backend that select the new columns. Existing rows are not rewritten. Then release the compatible customer JavaScript through the normal tested update/store process. Older customer apps ignore the new fields; new apps preserve existing behavior with older cached API responses.

No migration has been applied to production as part of this implementation. No products, prices, catalogue assignments, orders or fees are changed.
