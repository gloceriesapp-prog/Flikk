'use client';
import { useEffect, useState } from 'react';
interface Product { id: string; name: string; stock_tracking_enabled: boolean; stock_quantity: number | null; product_variants: { id: string; quantity: number; unit_type: string; stock_quantity: number | null }[] }
export function PackStockEditor() {
  const [items, setItems] = useState<Product[]>([]); const [next, setNext] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [counts, setCounts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState('');
  async function load(after?: string) {
    setBusy(true); setError(''); setSaved('');
    try {
      const response = await fetch(`/api/inventory-pack-stock${after ? `?after=${after}` : ''}`); const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(current => after ? [...current, ...data.items] : data.items); setNext(data.nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load inventory.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) void load(); });
    return () => { mounted = false; };
  }, []);
  async function save(product: Product, variantId: string | null, key: string) {
    setBusy(true); setError(''); setSaved('');
    try {
      const quantity = Number(counts[key]);
      const response = await fetch('/api/inventory-pack-stock', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, variantId, quantity }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setItems(current => current.map(p => {
        if (p.id !== product.id) return p;
        const variants = p.product_variants.map(v => v.id === variantId ? { ...v, stock_quantity: quantity } : v);
        return { ...p, stock_tracking_enabled: true, stock_quantity: variantId ? variants.reduce((total, variant) => total + (variant.stock_quantity ?? 0), 0) : quantity, product_variants: variants };
      }));
      setSaved(`Saved ${quantity} available packs for ${product.name}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save count.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 p-6"><h1 className="text-2xl font-semibold">Available packs</h1><p className="text-sm text-gray-500">Count retail packs available to sell, excluding existing reservations. Set each size separately. An unconfirmed size cannot be ordered. Bulk stock must be packed into sellable units before entering these counts.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {saved && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{saved}</p>}
    <button onClick={() => void load()} disabled={busy} className="rounded-xl border px-4 py-2">Refresh</button>
    {items.map(p => <article key={p.id} className="space-y-3 rounded-2xl border bg-white p-5"><strong>{p.name}</strong>
      <p className="text-sm text-gray-500">{!p.stock_tracking_enabled ? 'Stock unconfirmed — enter the actual packs available to enable ordering.' : `${p.stock_quantity ?? 0} confirmed packs across all sizes.`}</p>
      {(p.product_variants.length ? p.product_variants : [{ id: '', quantity: 1, unit_type: 'pack', stock_quantity: p.stock_tracking_enabled ? p.stock_quantity : null }]).map(v => {
        const key = v.id || p.id; const value = counts[key] ?? (v.stock_quantity === null ? '' : String(v.stock_quantity));
        return <div key={key} className="flex items-center gap-3"><span className="w-28 text-sm">{v.quantity} {v.unit_type}</span><input aria-label={`Available ${v.quantity} ${v.unit_type} packs`} type="number" min={0} step={1} placeholder="Unconfirmed" value={value} onChange={e => setCounts(c => ({ ...c, [key]: e.target.value }))} className="w-36 rounded-xl border p-2" /><button disabled={busy || counts[key] === undefined || !/^\d+$/.test(counts[key])} onClick={() => void save(p, v.id || null, key)} className="rounded-xl bg-black px-4 py-2 text-white">Save count</button></div>;
      })}</article>)}
    {next && <button disabled={busy} onClick={() => void load(next)} className="rounded-xl border px-4 py-2">Load more</button>}
  </section>;
}
