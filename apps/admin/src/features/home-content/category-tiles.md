# Custom Grocery category tiles

In **Category-tab content → Grocery**, select the category-tiles section and expand a tile (or Add category).

- **Tile title** is a custom customer-facing label, for example “Rice & Atta”. It does not infer product matching.
- **Tile contents → Catalogue categories** lets you choose existing catalogue subcategories. Rice and Atta can share one tile. Current eligible products are resolved by the existing collection API.
- **Hand-picked products** selects exact products instead.
- Selecting a new source clears previous template product/category/word/store/discount filters. Optional matching rules can be set afterwards.
- The image, visibility and ordering remain editable. Publish saves through the existing authenticated, revision-checked workflow.

The customer app uses the same artwork aspect ratio (0.85), 18px corners, 90% contained image and label typography as its Categories screen. The Admin grid-column and horizontal/grid layout choices are honoured; four columns uses four slots per row, with the first tile spanning two slots.

An unfinished category tile does not fall back to unrelated stock. Category-tile collections use the tile’s own rules, not the hidden parent section selection. Product sections retain their existing parent filtering.

No database migration or native dependency change is required. Deploy Admin/backend together and release the compatible customer JavaScript through the normal tested update/store workflow. Existing live content is not rewritten by this change.
