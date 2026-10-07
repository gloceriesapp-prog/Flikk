'use client';

// Home Categories — Home screen's own top tab row (All/Groceries/Fresh/
// Bakery/..., apps/customer/src/screens/home/components/CategoryTabs.tsx)
// and each tab's tile grid. Deliberately its own page, own tables
// (home_tabs/home_tab_tiles), own Storage bucket (home-tab-images) —
// completely separate from "Categories" (categories/category_sections/
// sub_categories) so editing one can never affect the other, per an
// explicit ask. Two-pane layout — left: the tab list itself (add/select/
// delete a tab); right: the selected tab's own tiles (add/edit/delete a
// tile) — so it's always visually obvious which tab you're editing tiles
// for, not a single flat list mixing tabs and tiles together.

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { HomeTab, HomeTabBanner, HomeTabTile, HomeTabTileLinkType } from '@/lib/types';
import { fetchHomeTabBanners, fetchHomeTabs, fetchHomeTabTiles } from '@/lib/supabase/homeTabs';
import { fetchCategories } from '@/lib/supabase/categories';
import { fetchAllSubCategoryOptions } from '@/lib/supabase/subcategories';
import { fetchStores } from '@/lib/supabase/stores';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

interface TileLink {
  linkType: HomeTabTileLinkType | null;
  linkId: string | null;
}
type LinkOptions = Record<HomeTabTileLinkType, { id: string; label: string }[]>;

const LINK_SELECT_CLASS =
  'min-w-0 rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

// Where tapping a tile goes: a type select, then a target picker from the
// real categories/subcategories/stores lists.
function TileLinkPicker({ value, options, onChange }: { value: TileLink; options: LinkOptions; onChange: (next: TileLink) => void }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <select
        aria-label="Tile opens"
        value={value.linkType ?? 'none'}
        onChange={(e) => {
          const linkType = e.target.value === 'none' ? null : (e.target.value as HomeTabTileLinkType);
          onChange({ linkType, linkId: null });
        }}
        className={LINK_SELECT_CLASS}
      >
        <option value="none">Opens nothing</option>
        <option value="category">Opens a category</option>
        <option value="subcategory">Opens a subcategory</option>
        <option value="store">Opens a store</option>
      </select>
      {value.linkType && (
        <select
          aria-label={`Pick ${value.linkType}`}
          value={value.linkId ?? ''}
          onChange={(e) => onChange({ linkType: value.linkType, linkId: e.target.value || null })}
          className={LINK_SELECT_CLASS}
        >
          <option value="">Select {value.linkType}…</option>
          {options[value.linkType].map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function HomeCategoriesPage() {
  const [tabs, setTabs] = useState<HomeTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tiles, setTiles] = useState<HomeTabTile[]>([]);
  const [banners, setBanners] = useState<HomeTabBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tilesLoading, setTilesLoading] = useState(false);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newTabName, setNewTabName] = useState('');
  const [addingTab, setAddingTab] = useState(false);

  const [newTileName, setNewTileName] = useState('');
  const [newTileImage, setNewTileImage] = useState<string | undefined>(undefined);
  const [addingTile, setAddingTile] = useState(false);
  const [newTileLink, setNewTileLink] = useState<TileLink>({ linkType: null, linkId: null });
  const [linkOptions, setLinkOptions] = useState<LinkOptions>({ category: [], subcategory: [], store: [] });

  const [newBannerImage, setNewBannerImage] = useState<string | undefined>(undefined);
  const [addingBanner, setAddingBanner] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadTabs = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await fetchHomeTabs();
      setTabs(rows);
      setSelectedTabId((current) => current ?? rows[0]?.id ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load Home tabs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTiles = useCallback(async (tabId: string) => {
    setTilesLoading(true);
    try {
      setTiles(await fetchHomeTabTiles(tabId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tiles.');
    } finally {
      setTilesLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadTabs);
  }, [loadTabs]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchAllSubCategoryOptions(), fetchStores()])
      .then(([categories, subcategories, stores]) =>
        setLinkOptions({
          category: categories.map((c) => ({ id: c.id, label: c.name })),
          subcategory: subcategories,
          store: stores.map((st) => ({ id: st.id, label: st.name })),
        }),
      )
      .catch(() => setError('Could not load categories/stores for tile links.'));
  }, []);

  const loadBanners = useCallback(async (tabId: string) => {
    setBannersLoading(true);
    try {
      setBanners(await fetchHomeTabBanners(tabId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load banners.');
    } finally {
      setBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTabId) Promise.resolve().then(() => loadTiles(selectedTabId));
    else Promise.resolve().then(() => setTiles([]));
  }, [selectedTabId, loadTiles]);

  useEffect(() => {
    if (selectedTabId) Promise.resolve().then(() => loadBanners(selectedTabId));
    else Promise.resolve().then(() => setBanners([]));
  }, [selectedTabId, loadBanners]);

  const selectedTab = tabs.find((t) => t.id === selectedTabId) ?? null;

  async function handleAddTab() {
    const name = newTabName.trim();
    if (!name) return;

    setAddingTab(true);
    setError(null);
    try {
      const res = await fetch('/api/home-tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sortOrder: tabs.length, isActive: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Add failed.');
      }
      const created: HomeTab = await res.json();
      setNewTabName('');
      await loadTabs();
      setSelectedTabId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add tab — try again.');
    } finally {
      setAddingTab(false);
    }
  }

  async function handleDeleteTab(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/home-tabs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Delete failed.');
      }
      if (selectedTabId === id) setSelectedTabId(null);
      await loadTabs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tab — try again.');
    }
  }

  async function handleAddTile() {
    const name = newTileName.trim();
    if (!name || !selectedTabId) return;

    setAddingTile(true);
    setError(null);
    try {
      const res = await fetch('/api/home-tab-tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeTabId: selectedTabId, name, imageUrl: newTileImage, sortOrder: tiles.length, ...newTileLink }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Add failed.');
      }
      setNewTileName('');
      setNewTileImage(undefined);
      setNewTileLink({ linkType: null, linkId: null });
      await loadTiles(selectedTabId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add tile — try again.');
    } finally {
      setAddingTile(false);
    }
  }

  async function handleTileImageChange(tile: HomeTabTile, imageUrl: string) {
    setError(null);
    try {
      const res = await fetch(`/api/home-tab-tiles/${tile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tile.name, imageUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not save photo.');
      }
      if (selectedTabId) await loadTiles(selectedTabId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save photo — try again.');
    }
  }

  async function handleTileLinkChange(tile: HomeTabTile, link: TileLink) {
    // Local-only until a target is picked; a half-picked link can't be saved.
    setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, ...link } : t)));
    if (link.linkType && !link.linkId) return;
    setError(null);
    try {
      const res = await fetch(`/api/home-tab-tiles/${tile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tile.name, imageUrl: tile.imageUrl ?? null, ...link }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not save link.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save link — try again.');
      if (selectedTabId) await loadTiles(selectedTabId);
    }
  }

  async function handleDeleteTile(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/home-tab-tiles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Delete failed.');
      }
      if (selectedTabId) await loadTiles(selectedTabId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tile — try again.');
    }
  }

  async function handleAddBanner() {
    if (!newBannerImage || !selectedTabId) return;

    setAddingBanner(true);
    setError(null);
    try {
      const res = await fetch('/api/home-tab-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeTabId: selectedTabId, imageUrl: newBannerImage, sortOrder: banners.length }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Add failed.');
      }
      setNewBannerImage(undefined);
      await loadBanners(selectedTabId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add banner — try again.');
    } finally {
      setAddingBanner(false);
    }
  }

  async function handleDeleteBanner(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/home-tab-banners/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Delete failed.');
      }
      if (selectedTabId) await loadBanners(selectedTabId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete banner — try again.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium text-ink">Home Categories</h1>
        <p className="text-sm text-muted">
          Home screen&apos;s own top tab row and each tab&apos;s tile grid — separate from the main Categories screen, editing here never
          affects it.
        </p>
      </div>

      {loadError && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {loadError} —{' '}
          <button type="button" onClick={loadTabs} className="underline">
            retry
          </button>
        </p>
      )}
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left pane — the tab list itself */}
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tabs</p>
          <p className="-mt-2 text-[11px] text-muted">Top tab row — title only, like Blinkit/Instamart. Photos go on the tiles below.</p>

          <div className="flex flex-col gap-1.5">
            {loading && <p className="text-sm text-muted">Loading…</p>}
            {!loading && tabs.length === 0 && <p className="text-sm text-muted">No tabs yet — add one below.</p>}
            {tabs.map((tab) => (
              <div
                key={tab.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTabId(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedTabId(tab.id);
                }}
                className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left cursor-pointer ${
                  tab.id === selectedTabId ? 'border-ink bg-accent' : 'border-border hover:bg-accent/60'
                }`}
              >
                <span className="flex-1 truncate text-sm font-medium text-ink">{tab.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTab(tab.id);
                  }}
                  className="text-muted hover:text-danger"
                  aria-label={`Delete ${tab.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
            <input
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTab();
                }
              }}
              placeholder="New tab (e.g. Pharmacy)"
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
            <button
              type="button"
              onClick={handleAddTab}
              disabled={!newTabName.trim() || addingTab}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              <Plus size={14} />
              Add tab
            </button>
          </div>
        </div>

        {/* Right pane — the selected tab's own tiles */}
        <div className="rounded-3xl border border-border bg-card p-5">
          {!selectedTab ? (
            <p className="py-10 text-center text-sm text-muted">Pick a tab on the left, or add one.</p>
          ) : (
            <>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                Tiles inside &quot;{selectedTab.name}&quot;
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {tilesLoading && <p className="col-span-full text-sm text-muted">Loading…</p>}
                {!tilesLoading && tiles.length === 0 && (
                  <p className="col-span-full text-sm text-muted">No tiles yet — add the first one below.</p>
                )}
                {tiles.map((tile) => (
                  <div key={tile.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border p-3">
                    <div className="relative">
                      <ProductImageUpload
                        imageUrl={tile.imageUrl}
                        onChange={(imageUrl) => handleTileImageChange(tile, imageUrl)}
                        bucket="home-tab-images"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteTile(tile.id)}
                        aria-label={`Remove ${tile.name}`}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-danger"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="truncate text-center text-xs font-medium text-ink" title={tile.name}>
                      {tile.name}
                    </p>
                    <TileLinkPicker
                      value={{ linkType: tile.linkType, linkId: tile.linkId }}
                      options={linkOptions}
                      onChange={(link) => handleTileLinkChange(tile, link)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-end gap-3 border-t border-border pt-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted">Photo</span>
                  <ProductImageUpload imageUrl={newTileImage} onChange={(url) => setNewTileImage(url)} bucket="home-tab-images" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted">Title</span>
                  <input
                    value={newTileName}
                    onChange={(e) => setNewTileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTile();
                      }
                    }}
                    placeholder="e.g. Fresh fruits"
                    className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div className="flex w-44 flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted">Opens</span>
                  <TileLinkPicker value={newTileLink} options={linkOptions} onChange={setNewTileLink} />
                </div>
                <button
                  type="button"
                  onClick={handleAddTile}
                  disabled={!newTileName.trim() || addingTile || Boolean(newTileLink.linkType && !newTileLink.linkId)}
                  className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  <Plus size={14} />
                  {addingTile ? 'Submitting…' : 'Submit'}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted">Add a photo and title, then submit — both are saved together.</p>

              <div className="mt-8 border-t border-border pt-6">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Ads &amp; posters inside &quot;{selectedTab.name}&quot;
                </p>
                <p className="mb-4 text-[11px] text-muted">Shown as a promo banner below the tiles on this tab, on the customer app.</p>

                <div className="flex flex-wrap gap-3">
                  {bannersLoading && <p className="text-sm text-muted">Loading…</p>}
                  {!bannersLoading && banners.length === 0 && <p className="text-sm text-muted">No banners yet — add one below.</p>}
                  {banners.map((banner) => (
                    <div key={banner.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={banner.imageUrl} alt="" className="h-24 w-40 rounded-2xl border border-border object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner.id)}
                        aria-label="Remove banner"
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-danger"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <ProductImageUpload imageUrl={newBannerImage} onChange={(url) => setNewBannerImage(url)} bucket="home-tab-banner-images" />
                  <button
                    type="button"
                    onClick={handleAddBanner}
                    disabled={!newBannerImage || addingBanner}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    <Plus size={14} />
                    {addingBanner ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
