'use client';
import type { ContentSelection } from '@/lib/homeContent';
import { categoryTileSelection } from './categoryTileSelection';
import { CataloguePicker } from './CataloguePicker';
import { Field, inputClass, Toggle } from './Fields';

export function SelectionEditor({
  value,
  onChange,
  categoryTile = false,
}: {
  value: ContentSelection;
  categoryTile?: boolean;
  onChange: (value: ContentSelection) => void;
}) {
  const update = (patch: Partial<ContentSelection>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <Field
        label={categoryTile ? "Tile contents" : "Product selection"}
        hint="Every selection is limited to stock available near the customer's delivery address."
      >
        <select
          value={value.mode}
          onChange={(event) => {
            const mode = event.target.value as ContentSelection['mode'];
            if (categoryTile) onChange(categoryTileSelection(value, mode === 'manual' ? { products: value.productIds } : { categories: value.categoryIds }));
            else update({ mode });
          }}
          className={inputClass}
        >
          <option value="automatic">{categoryTile ? 'Catalogue category · standard sidebar' : 'Automatic · match catalogue rules'}</option>
          <option value="manual">{categoryTile ? 'Custom collection · 3-column product grid' : 'Curated · choose and order products'}</option>
        </select>
      </Field>
      {value.mode === 'manual' && (
        <CataloguePicker
          kind="products"
          value={value.productIds}
          onChange={(productIds) => categoryTile ? onChange(categoryTileSelection(value, { products: productIds })) : update({ productIds })}
        />
      )}
      {categoryTile && value.mode === 'automatic' && <div className="space-y-2">
        <p className="text-xs text-slate-600">Select a catalogue subcategory to link this tile to its parent category. Customers see the normal category sidebar and can browse all of its subcategories. Use Custom collection to show only hand-picked products without a sidebar.</p>
        <CataloguePicker kind="categories" value={value.categoryIds} onChange={categoryIds => onChange(categoryTileSelection(value, { categories: categoryIds.slice(-1) }))} />
      </div>}
      {categoryTile && <p className="text-xs leading-5 text-slate-500">Catalogue tiles use the normal category browser. Custom collections show the exact selected products in three columns, without a sidebar. Switching modes clears stale template filters.</p>}
      <details className="rounded-xl border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">
          Category, shop and matching rules
        </summary>
        <div className="mt-4 space-y-4">
          {(!categoryTile || value.mode === 'manual') && <CataloguePicker
            kind="categories"
            value={value.categoryIds}
            onChange={(categoryIds) => update({ categoryIds })}
          />}
          <CataloguePicker
            kind="stores"
            value={value.storeIds}
            onChange={(storeIds) => update({ storeIds })}
          />
          <Field
            label="Include words"
            hint="Comma-separated words. A product must match at least one. Leave blank to include all eligible products."
          >
            <input
              key={value.includeTerms.join(',')}
              defaultValue={value.includeTerms.join(', ')}
              onBlur={(event) =>
                update({
                  includeTerms: event.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Exclude words"
            hint="Products matching any of these words are excluded. These rules also apply to curated products."
          >
            <input
              key={value.excludeTerms.join(',')}
              defaultValue={value.excludeTerms.join(', ')}
              onBlur={(event) =>
                update({
                  excludeTerms: event.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
              className={inputClass}
            />
          </Field>
          <Toggle
            label="Show genuine discounted products only"
            checked={value.discountedOnly}
            onChange={(discountedOnly) => update({ discountedOnly })}
          />
        </div>
      </details>
    </div>
  );
}
