'use client';

import { useEffect, useState } from 'react';
export interface CatalogueItem {
  id: string;
  name: string;
  imageUrl: string;
  detail: string;
}
export function CataloguePicker({
  kind,
  value,
  onChange,
}: {
  kind: 'products' | 'categories' | 'stores';
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [selected, setSelected] = useState<Record<string, CatalogueItem>>({});
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const idKey = value.join(',');
  useEffect(() => {
    if (!idKey) return;
    const controller = new AbortController();
    void fetch(`/api/home-content/catalogue?kind=${kind}&ids=${encodeURIComponent(idKey)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load selected items.');
        const data = await response.json();
        setSelected(Object.fromEntries(data.items.map((item: CatalogueItem) => [item.id, item])));
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [idKey, kind]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void fetch(
        `/api/home-content/catalogue?kind=${kind}&q=${encodeURIComponent(search)}&offset=${offset}`,
        { signal: controller.signal },
      )
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setItems((old) => (offset === 0 ? data.items : [...old, ...data.items]));
          setNextOffset(data.nextOffset);
          setSelected((old) => ({
            ...old,
            ...Object.fromEntries(data.items.map((item: CatalogueItem) => [item.id, item])),
          }));
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, search, offset]);
  function move(index: number, delta: number) {
    const copy = [...value];
    [copy[index], copy[index + delta]] = [copy[index + delta], copy[index]];
    onChange(copy);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>
          Selected {kind} · {value.length}/100
        </span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      {value.length > 0 && (
        <ul className="mb-3 max-h-40 space-y-1 overflow-auto">
          {value.map((id, index) => (
            <li
              key={id}
              className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">
                {selected[id]?.name ?? `Unavailable item (${id.slice(0, 8)})`}
              </span>
              <button
                type="button"
                aria-label="Move selected item up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move selected item down"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
                className="disabled:opacity-25"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove selected item"
                onClick={() => onChange(value.filter((v) => v !== id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        aria-label={`Search ${kind}`}
        placeholder={`Search ${kind}…`}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setOffset(0);
        }}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-white"
          >
            <input
              type="checkbox"
              checked={value.includes(item.id)}
              disabled={!value.includes(item.id) && value.length >= 100}
              onChange={(event) =>
                onChange(
                  event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id),
                )
              }
            />
            <span className="min-w-0">
              <span className="block truncate text-sm text-slate-800">{item.name}</span>
              <span className="block truncate text-xs text-slate-500">{item.detail}</span>
            </span>
          </label>
        ))}
        {!items.length && !loading && !error && (
          <p className="p-2 text-xs text-slate-500">No matching {kind}.</p>
        )}
      </div>
      {loading && <p className="mt-2 text-xs text-slate-500">Loading…</p>}
      {nextOffset !== null && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setOffset(nextOffset)}
          className="mt-2 text-xs font-semibold text-blue-600"
        >
          Load more
        </button>
      )}
    </div>
  );
}
