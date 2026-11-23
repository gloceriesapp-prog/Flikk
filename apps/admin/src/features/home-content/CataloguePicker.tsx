'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, X } from '@/components/icons';
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
  tab,
  onScopeAvailable,
}: {
  kind: 'products' | 'categories' | 'stores';
  value: string[];
  onChange: (ids: string[]) => void;
  tab?: string;
  onScopeAvailable?: (available: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [selected, setSelected] = useState<Record<string, CatalogueItem>>({});
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedError, setSelectedError] = useState('');
  const idKey = [...value].sort().join(',');
  const [resolvedIdKey, setResolvedIdKey] = useState('');
  const [missingSelectedIds, setMissingSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (!idKey) return;
    let active = true;
    void fetch(`/api/home-content/catalogue?kind=${kind}&ids=${encodeURIComponent(idKey)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load selected items.');
        const data = await response.json();
        if (!active) return;
        setSelectedError('');
        setSelected(old => ({ ...old, ...Object.fromEntries(data.items.map((item: CatalogueItem) => [item.id, item])) }));
        const found = new Set(data.items.map((item: CatalogueItem) => item.id));
        setMissingSelectedIds(idKey.split(',').filter(id => !found.has(id)));
        setResolvedIdKey(idKey);
      })
      .catch((err) => {
        if (active) setSelectedError(err instanceof Error ? err.message : 'Could not load selected items.');
      });
    return () => { active = false; };
  }, [idKey, kind]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void fetch(
        `/api/home-content/catalogue?kind=${kind}&q=${encodeURIComponent(search)}&offset=${offset}${tab ? `&tab=${encodeURIComponent(tab)}` : ''}`,
      )
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          if (!active) return;
          if (typeof data.supportsQuickTabScope === 'boolean') onScopeAvailable?.(data.supportsQuickTabScope);
          setItems((old) => (offset === 0 ? data.items : [...old, ...data.items]));
          setNextOffset(data.nextOffset);
          setSelected((old) => ({
            ...old,
            ...Object.fromEntries(data.items.map((item: CatalogueItem) => [item.id, item])),
          }));
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : 'Could not load the catalogue.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      active = false;
    };
  }, [kind, search, offset, tab, onScopeAvailable]);
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
                {selected[id]?.name ?? (resolvedIdKey === idKey ? `Unavailable item (${id.slice(0, 8)})` : 'Loading selected item…')}
                {selected[id] && resolvedIdKey === idKey && missingSelectedIds.includes(id) ? ' — unavailable' : ''}
              </span>
              <button
                type="button"
                aria-label="Move selected item up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="disabled:opacity-25"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label="Move selected item down"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
                className="disabled:opacity-25"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                aria-label="Remove selected item"
                onClick={() => onChange(value.filter((v) => v !== id))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length > 0 && selectedError && <p role="alert" className="mb-2 text-xs text-red-600">{selectedError}</p>}
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
