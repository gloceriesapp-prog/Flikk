'use client';

import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import { createItem, type HomeContentSection, type HomeContentItem } from '@/lib/homeContent';
import { Field, inputClass, Toggle } from './Fields';
import { SelectionEditor } from './SelectionEditor';

export function SectionEditor({
  value: section,
  onChange,
}: {
  value: HomeContentSection;
  onChange: (value: HomeContentSection) => void;
}) {
  const update = (patch: Partial<HomeContentSection>) => onChange({ ...section, ...patch });
  const updateItem = (index: number, patch: Partial<HomeContentItem>) =>
    update({ items: section.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  function moveItem(index: number, delta: number) {
    const items = [...section.items];
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    update({ items });
  }
  const hasProducts = ['products', 'hero', 'stores', 'banner'].includes(section.kind);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {section.title || 'Untitled section'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {section.kind} · {section.id}
          </p>
        </div>
        <Toggle
          label="Visible in app"
          checked={section.enabled}
          onChange={(enabled) => update({ enabled })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={section.kind === 'footer' ? 'Brand name' : 'Title'}>
          <textarea
            value={section.title}
            maxLength={120}
            onChange={(event) => update({ title: event.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
        <Field label={section.kind === 'footer' ? 'Brand message' : 'Supporting text (optional)'}>
          <textarea
            value={section.subtitle}
            maxLength={300}
            onChange={(event) => update({ subtitle: event.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
        <Field label="Background color" hint="Six-digit hex. Leave blank for the page background.">
          <input
            value={section.backgroundColor}
            placeholder="#FFFFFF"
            maxLength={7}
            onChange={(event) => update({ backgroundColor: event.target.value })}
            className={inputClass}
          />
        </Field>
        {section.kind !== 'footer' && (
          <Field label="Visible items" hint="Maximum 24 products, shops or tiles per section.">
            <input
              type="number"
              min={1}
              max={24}
              value={section.limit}
              onChange={(event) => update({ limit: Number(event.target.value) })}
              className={inputClass}
            />
          </Field>
        )}
        {['products', 'hero', 'categories', 'brands'].includes(section.kind) && (
          <>
            <Field label="Layout">
              <select
                value={section.layout}
                onChange={(event) =>
                  update({ layout: event.target.value as HomeContentSection['layout'] })
                }
                className={inputClass}
              >
                <option value="horizontal">Horizontal scroll</option>
                <option value="grid">Grid</option>
              </select>
            </Field>
            {section.layout === 'grid' && (
              <Field label="Columns">
                <select
                  value={section.columns}
                  onChange={(event) =>
                    update({ columns: Number(event.target.value) as HomeContentSection['columns'] })
                  }
                  className={inputClass}
                >
                  {[2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} per row
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}
      </div>
      {['banner', 'hero'].includes(section.kind) && (
        <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
          <ProductImageUpload imageUrl={section.imageUrl} bucket="banners" onChange={(url) => update({ imageUrl: url })} />
          <Field
            label="Image URL"
            hint="Public HTTPS image. Change the URL when replacing an image to refresh customer caches."
          >
            <input
              type="url"
              value={section.imageUrl}
              onChange={(event) => update({ imageUrl: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Image aspect ratio" hint="Width divided by height; 2 gives a 2:1 banner.">
            <input
              type="number"
              min={0.3}
              max={5}
              step={0.1}
              value={section.imageAspectRatio}
              onChange={(event) => update({ imageAspectRatio: Number(event.target.value) })}
              className={inputClass}
            />
          </Field>
          <Toggle
            label="Fade the left and bottom edges into the background"
            checked={section.imageFade}
            onChange={(imageFade) => update({ imageFade })}
          />
        </div>
      )}
      {section.kind !== 'footer' && (
        <div className="flex flex-wrap gap-4">
          <Toggle
            label="Hide when there are no available items"
            checked={section.hideWhenEmpty}
            onChange={(hideWhenEmpty) => update({ hideWhenEmpty })}
          />
          <Toggle
            label={section.kind === 'stores' ? 'Show store button' : 'Show explore button'}
            checked={section.buttonEnabled}
            onChange={(buttonEnabled) => update({ buttonEnabled })}
          />
        </div>
      )}
      {section.kind !== 'footer' && section.buttonEnabled && (
        <Field label="Button text">
          <input
            value={section.buttonLabel}
            maxLength={60}
            onChange={(event) => update({ buttonLabel: event.target.value })}
            className={inputClass}
          />
        </Field>
      )}
      {hasProducts && (
        <SelectionEditor
          value={section.selection}
          onChange={(selection) => update({ selection })}
        />
      )}
      {['categories', 'brands'].includes(section.kind) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {section.kind === 'brands' ? 'Brands' : 'Category tiles'} · {section.items.length}/40
            </h3>
            <button
              type="button"
              disabled={section.items.length >= 40}
              onClick={() => {
                const item = createItem(
                  `item-${crypto.randomUUID()}`,
                  section.kind === 'brands' ? 'New brand' : 'New category',
                );
                item.selection.mode = 'manual';
                update({ items: [...section.items, item] });
              }}
              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-30"
            >
              + Add {section.kind === 'brands' ? 'brand' : 'category'}
            </button>
          </div>
          {section.kind === 'brands' && (
            <p className="text-xs leading-5 text-slate-500">
              Only add brands and origins you have verified. Choose their real catalogue products;
              the app does not infer a producer’s origin from product names.
            </p>
          )}
          {section.items.map((item, index) => (
            <details key={item.id} className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                {index + 1}. {item.title}
                {!item.enabled && ' · hidden'}
              </summary>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Toggle
                    label="Visible tile"
                    checked={item.enabled}
                    onChange={(enabled) => updateItem(index, { enabled })}
                  />
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                      className="disabled:opacity-20"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      disabled={index === section.items.length - 1}
                      onClick={() => moveItem(index, 1)}
                      className="disabled:opacity-20"
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        update({ items: section.items.filter((i) => i.id !== item.id) })
                      }
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tile title">
                    <input
                      value={item.title}
                      maxLength={120}
                      onChange={(event) => updateItem(index, { title: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <ProductImageUpload imageUrl={item.imageUrl} bucket={section.kind === 'categories' ? 'categories' : 'appsui'} onChange={(url) => updateItem(index, { imageUrl: url })} />
                  <Field label="Image URL">
                    <input
                      type="url"
                      value={item.imageUrl}
                      onChange={(event) => updateItem(index, { imageUrl: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tile color">
                    <input
                      value={item.backgroundColor}
                      maxLength={7}
                      onChange={(event) =>
                        updateItem(index, { backgroundColor: event.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                  {section.kind === 'brands' && (
                    <Field label="Place of origin">
                      <input
                        value={item.origin}
                        maxLength={120}
                        onChange={(event) => updateItem(index, { origin: event.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  )}
                  <Field label="Short description">
                    <input
                      value={item.description}
                      maxLength={300}
                      onChange={(event) => updateItem(index, { description: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <SelectionEditor
                  value={item.selection}
                  onChange={(selection) => updateItem(index, { selection })}
                />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
