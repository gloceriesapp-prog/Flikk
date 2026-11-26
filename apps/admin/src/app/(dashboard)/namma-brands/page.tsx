'use client';

// Namma Brands cards (customer Home, above the welcome card). Up to 6 brand
// cards: brand, title (defaults to the brand name), 1–2 product photos
// (default: the brand's top sellers near each customer). A card whose brand
// has nothing in stock near a customer is hidden for them. Turn the
// block on, schedule it and change its header image in Home Sections.
// Saves through PUT /api/namma-brands (all cards in one transaction).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/components/icons';
import { toast } from '@/components/ui/Toast';
import { MAX_NAMMA_CARDS, previewPill, twoLineTitle, type NammaCard, type NammaProduct } from '@/lib/home/nammaBrands';
import { DEFAULT_NAMMA_HEADER } from '../../../../../../packages/home-content/sectionLayout.js';

type Brand = { id: string; name: string; isActive: boolean };
const inputClass = 'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-ink';

export default function NammaBrandsPage() {
  const [cards, setCards] = useState<NammaCard[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Record<string, NammaProduct[]>>({});
  const [header, setHeader] = useState(DEFAULT_NAMMA_HEADER);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [cardsRes, brandsRes, sectionsRes] = await Promise.all([fetch('/api/namma-brands'), fetch('/api/brands'), fetch('/api/home-sections')]);
        const cardsBody = await cardsRes.json().catch(() => null);
        if (cardsRes.status === 503 && cardsBody?.pending) setPending(true);
        else if (cardsRes.ok) {
          setCards(cardsBody.cards as NammaCard[]);
          for (const card of cardsBody.cards as NammaCard[]) loadProducts(card.brandId);
        }
        if (brandsRes.ok) setBrands(((await brandsRes.json()) as Brand[]).filter((b) => b.isActive));
        if (sectionsRes.ok) {
          const rows = (await sectionsRes.json()) as { key: string; enabled: boolean; banner_image_url?: string | null }[];
          const row = rows.find((r) => r.key === 'namma-brands');
          setEnabled(row ? row.enabled : null);
          if (row?.banner_image_url) setHeader(row.banner_image_url);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // A card's brand products (in stock, all shops), for photos and the preview.
  function loadProducts(brandId: string) {
    fetch(`/api/namma-brands/products?brandId=${brandId}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((body: { products: NammaProduct[] }) => setProducts((current) => ({ ...current, [brandId]: body.products })))
      .catch(() => undefined);
  }

  const available = useMemo(() => {
    const used = new Set(cards.map((c) => c.brandId));
    const q = search.trim().toLowerCase();
    return brands.filter((b) => !used.has(b.id) && (!q || b.name.toLowerCase().includes(q))).slice(0, 12);
  }, [brands, cards, search]);

  const patch = (index: number, change: Partial<NammaCard>) => setCards((list) => list.map((c, i) => (i === index ? { ...c, ...change } : c)));
  const move = (index: number, by: -1 | 1) => setCards((list) => {
    const next = [...list];
    const [card] = next.splice(index, 1);
    next.splice(index + by, 0, card!);
    return next;
  });

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/namma-brands', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cards }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not save.');
      toast.success('Namma Brands saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Namma Brands</h1>
          <p className="text-sm text-muted">
            Local brand cards on Home, above the welcome card. Shown only with 3 or more cards that have stock near the customer.
            {' '}Turn it on, schedule it and change the header image in <Link href="/home-sections" className="underline">Home Sections</Link>
            {enabled === false && ' (currently off)'}.
          </p>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving || pending} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      </div>

      {pending && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-ink">Namma Brands needs its database update before cards can be saved.</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          {cards.map((card, index) => {
            const list = products[card.brandId] ?? [];
            const picked = card.productIds;
            return (
              <section key={card.brandId} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">{index + 1}. {card.brandName}</h3>
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="btn btn-ghost"><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Move down" disabled={index === cards.length - 1} onClick={() => move(index, 1)} className="btn btn-ghost"><ArrowDown size={14} /></button>
                    <button type="button" aria-label="Remove card" onClick={() => setCards((l) => l.filter((_, i) => i !== index))} className="btn btn-ghost text-danger"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <label className="text-xs font-medium text-muted">Card title
                    <input className={clsx(inputClass, 'mt-1.5')} value={card.title} maxLength={60} placeholder={card.brandName}
                      onChange={(e) => patch(index, { title: e.target.value })} />
                  </label>
                </div>
                <p className="mt-3 text-xs font-medium text-muted">
                  Photos: pick 1–2 ({picked.length ? `${picked.length} picked` : 'none picked: the brand’s top sellers near each customer'})
                </p>
                {list.length === 0 ? <p className="mt-1 text-xs text-muted">No products in stock for this brand yet; the card stays hidden until there are.</p> : (
                  <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                    {list.map((p) => {
                      const on = picked.includes(p.id);
                      return (
                        <button key={p.id} type="button" title={`${p.name} · ${p.storeName}`}
                          onClick={() => patch(index, { productIds: on ? picked.filter((id) => id !== p.id) : [...picked, p.id].slice(-2) })}
                          className={clsx('flex w-24 flex-col items-center rounded-xl border p-1.5 text-[11px]', on ? 'border-brand bg-brand-soft' : 'border-border')}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- small picker thumbnail */}
                          {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-16 w-14 object-contain" /> : <span className="h-16" />}
                          <span className="line-clamp-2 text-center text-ink">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {cards.length < MAX_NAMMA_CARDS && (
            <section className="card p-5">
              <h3 className="mb-2 text-sm font-semibold text-ink">Add a brand card ({cards.length}/{MAX_NAMMA_CARDS})</h3>
              <input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brands" />
              <div className="mt-2 flex flex-wrap gap-2">
                {available.map((b) => (
                  <button key={b.id} type="button" className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-ink hover:bg-canvas"
                    onClick={() => { setCards((l) => [...l, { brandId: b.id, brandName: b.name, title: '', productIds: [], pillMode: 'discount' }]); setSearch(''); loadProducts(b.id); }}>
                    <Plus size={12} /> {b.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Live preview (shop prices across all shops; the app uses each customer’s nearby shops)</p>
          <div className="mx-auto max-w-[390px] overflow-hidden rounded-3xl border border-border">
            <div className="pb-3" style={{ backgroundColor: '#D0E0FD' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- preview of an external CDN image at its own shape */}
              <img src={header} alt="Namma Brands" className="w-full" />
              <div className="mt-2 grid grid-cols-3 gap-[10px] px-3">
                {cards.map((card) => {
                  const list = products[card.brandId] ?? [];
                  const pill = previewPill(card.pillMode, list);
                  const photos = (card.productIds.length ? card.productIds.map((id) => list.find((p) => p.id === id)).filter(Boolean) as NammaProduct[] : list).filter((p) => p.imageUrl).slice(0, card.productIds.length || 2);
                  return (
                    <div key={card.brandId} className={clsx('flex flex-col overflow-hidden rounded-2xl bg-white', !pill && 'opacity-40')}>
                      <p className="line-clamp-2 h-[46px] whitespace-pre-line px-2 pt-2 text-center text-[14px] font-semibold leading-[18px] text-ink">{twoLineTitle(card.title.trim() || card.brandName)}</p>
                      <div className="flex h-[70px] items-end justify-center pb-2">
                        {photos.map((p, i) => (
                          // eslint-disable-next-line @next/next/no-img-element -- product photo preview
                          <img key={p.id} src={p.imageUrl!} alt="" className="h-[70px] w-[56%] object-contain" style={{ marginLeft: i ? '-10%' : 0 }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {cards.length < 3 && <p className="mt-2 text-center text-xs text-danger">Add at least 3 cards; with fewer the block stays hidden.</p>}
        </div>
      </div>
    </div>
  );
}
