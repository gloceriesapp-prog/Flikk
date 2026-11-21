'use client';

// "Image style" for a product's main photo: Standard (rembg cut-out, the
// default) or Premium background (Photoroom, api/product-images/premium).
// Premium: pick a background, Generate, compare with the standard photo,
// then "Use this one" or "Try again". Earlier premium photos stay listed, so
// the product can switch either way at any time without a new upload.
// Hidden entirely when the server has no Photoroom key.

import { useEffect, useState } from 'react';
import { Loader2 } from '@/components/icons';
import type { PremiumAttempt, PremiumState } from '@/app/api/product-images/premium/route';
import { COST_NOTE, DEFAULT_PASTEL, PRESETS, PRESET_IDS, type PresetId } from '@/lib/photoroomPresets';

export type ImageStyleChoice = { style: 'standard' } | { style: 'premium'; preset: PresetId; color: string | null };

async function loadState(productId?: string): Promise<PremiumState | null> {
  const res = await fetch(`/api/product-images/premium${productId ? `?productId=${productId}` : ''}`).catch(() => null);
  return res?.ok ? ((await res.json()) as PremiumState) : null;
}

function StyleRadios({ premium, onChange, disabled }: { premium: boolean; onChange: (premium: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[false, true].map((value) => (
        <button
          key={String(value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value)}
          className={`rounded-[10px] border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${premium === value ? 'border-brand bg-brand/10 text-ink' : 'border-border text-muted hover:text-ink'}`}
        >
          {value ? 'Premium background (Photoroom)' : 'Standard (rembg, default)'}
        </button>
      ))}
    </div>
  );
}

function PresetPicker({ preset, color, onChange }: { preset: PresetId; color: string; onChange: (preset: PresetId, color: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={(e) => onChange(e.target.value as PresetId, color)}
        className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-xs text-ink"
        aria-label="Premium background"
      >
        {PRESET_IDS.map((id) => <option key={id} value={id}>{PRESETS[id].label}</option>)}
      </select>
      {preset === 'pastel' && (
        <input type="color" value={color} onChange={(e) => onChange(preset, e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-border" aria-label="Pastel colour" />
      )}
    </div>
  );
}

function Usage({ state }: { state: PremiumState }) {
  return (
    <p className="text-[11px] text-muted">
      {COST_NOTE} · Photoroom used this month: <span className="font-semibold text-ink">{state.used} / {state.cap}</span>
    </p>
  );
}

// Add product: the product does not exist yet, so only the choice is made
// here; Premium opens the generate step right after the product is added.
export function ImageStyleChoiceField({ value, onChange }: { value: ImageStyleChoice; onChange: (value: ImageStyleChoice) => void }) {
  const [state, setState] = useState<PremiumState | null>(null);
  useEffect(() => { void Promise.resolve().then(() => loadState()).then(setState); }, []);
  if (!state?.enabled) return null;
  const premium = value.style === 'premium';
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
      <p className="text-xs font-semibold text-ink">Image style</p>
      <StyleRadios
        premium={premium}
        disabled={!!state.capMessage && !premium}
        onChange={(next) => onChange(next ? { style: 'premium', preset: 'studio', color: null } : { style: 'standard' })}
      />
      {value.style === 'premium' && (
        <>
          <PresetPicker preset={value.preset} color={value.color ?? DEFAULT_PASTEL} onChange={(preset, color) => onChange({ style: 'premium', preset, color: preset === 'pastel' ? color : null })} />
          <p className="text-[11px] text-muted">After you add the product you can generate and compare it with the standard photo.</p>
        </>
      )}
      {state.capMessage ? <p className="text-[11px] font-medium text-amber-600">{state.capMessage}</p> : <Usage state={state} />}
    </div>
  );
}

function Photo({ url, label }: { url: string | null; label: string }) {
  return (
    <figure className="flex flex-1 flex-col gap-1">
      <div className="aspect-[8/9] overflow-hidden rounded-xl border border-border bg-[#F9FAFB]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-[11px] text-muted">Not ready yet</span>}
      </div>
      <figcaption className="text-center text-[11px] font-medium text-muted">{label}</figcaption>
    </figure>
  );
}

export function PremiumImagePanel({ productId, imageUrl, start, onApplied }: {
  productId: string;
  imageUrl: string | undefined;
  // From Add product: open on Premium with this background picked.
  start?: { preset: PresetId; color: string | null };
  onApplied: (url: string) => void;
}) {
  const [state, setState] = useState<PremiumState | null>(null);
  const [premium, setPremium] = useState(Boolean(start));
  const [preset, setPreset] = useState<PresetId>(start?.preset ?? 'studio');
  const [color, setColor] = useState(start?.color ?? DEFAULT_PASTEL);
  const [preview, setPreview] = useState<PremiumAttempt | null>(null);
  const [busy, setBusy] = useState<'generate' | 'use' | 'cap' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capDraft, setCapDraft] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => loadState(productId)).then((next) => {
      setState(next);
      if (next?.style === 'premium') setPremium(true);
    });
  }, [productId]);

  if (!state?.enabled) return null;

  async function post(action: 'generate' | 'use' | 'cap', payload: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch('/api/product-images/premium', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, productId, ...payload }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; state?: PremiumState; imageUrl?: string } & Partial<PremiumState>;
      const next = body.state ?? (action === 'cap' && res.ok ? { ...state!, used: body.used!, cap: body.cap!, capMessage: body.capMessage ?? null } : null);
      if (next) setState(next);
      if (!res.ok) setError(body.error ?? 'Something went wrong.');
      return { ok: res.ok, next, imageUrl: body.imageUrl };
    } catch {
      setError('Network error. Try again.');
      return { ok: false, next: null, imageUrl: undefined };
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    const { ok, next } = await post('generate', { preset, color: preset === 'pastel' ? color : null });
    setPreview(ok ? next?.attempts.find((a) => a.status === 'done') ?? null : null);
  }

  async function use(attempt: PremiumAttempt | null) {
    const { ok, imageUrl: applied } = await post('use', { attemptId: attempt?.id ?? null });
    if (ok && applied) {
      onApplied(applied);
      setPreview(null);
      if (!attempt) setPremium(false);
    }
  }

  const done = state.attempts.filter((a) => a.status === 'done');
  const shown = preview ?? done.find((a) => a.url === imageUrl) ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">Image style <span className="font-normal text-muted">· now {state.style === 'premium' ? 'Premium' : 'Standard'}</span></p>
        <Usage state={state} />
      </div>
      <StyleRadios
        premium={premium}
        disabled={busy !== null}
        onChange={(next) => {
          setPremium(next);
          setPreview(null);
          if (!next && state.style === 'premium') void use(null);
        }}
      />

      {premium && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PresetPicker preset={preset} color={color} onChange={(p, c) => { setPreset(p); setColor(c); }} />
            <button
              type="button"
              onClick={generate}
              disabled={busy !== null || !!state.capMessage || !imageUrl}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-strong disabled:opacity-40"
            >
              {busy === 'generate' && <Loader2 size={12} className="animate-spin" />}
              {busy === 'generate' ? 'Generating…' : preview ? 'Try again' : 'Generate'}
            </button>
          </div>
          {state.capMessage && <p className="text-[11px] font-medium text-amber-600">{state.capMessage}</p>}

          {(shown || busy === 'generate') && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <Photo url={state.standardUrl} label="Standard (rembg)" />
                {busy === 'generate'
                  ? <div className="flex aspect-[8/9] flex-1 items-center justify-center rounded-xl border border-border"><Loader2 size={18} className="animate-spin text-muted" /></div>
                  : <Photo url={shown?.url ?? null} label={`Premium · ${shown ? PRESETS[shown.preset as PresetId]?.label ?? shown.preset : ''}`} />}
              </div>
              {preview && busy === null && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => use(preview)} className="rounded-[10px] bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-strong">Use this one</button>
                  <button type="button" onClick={generate} disabled={!!state.capMessage} className="rounded-[10px] border border-border px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-40">Try again</button>
                </div>
              )}
            </div>
          )}

          {done.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-muted">Earlier premium photos (click to compare, no new charge)</p>
              <div className="flex flex-wrap gap-2">
                {done.map((a) => (
                  <button key={a.id} type="button" onClick={() => setPreview(a)} title={PRESETS[a.preset as PresetId]?.label}
                    className={`h-14 w-[50px] overflow-hidden rounded-lg border ${a.url === imageUrl ? 'border-brand ring-2 ring-brand/30' : 'border-border'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url!} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-[11px] font-medium text-danger">{error}{error.includes('kept') ? '' : ' The standard photo is kept.'}</p>}

      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span>Monthly cap</span>
        <input
          type="number" min={0} max={100000}
          value={capDraft ?? String(state.cap)}
          onChange={(e) => setCapDraft(e.target.value)}
          className="w-20 rounded-lg border border-border px-2 py-1 text-ink"
          aria-label="Monthly Photoroom cap"
        />
        {capDraft !== null && capDraft !== String(state.cap) && (
          <button type="button" disabled={busy !== null} onClick={async () => { if ((await post('cap', { monthlyCap: Number(capDraft) })).ok) setCapDraft(null); }}
            className="rounded-lg border border-border px-2 py-1 font-medium text-ink">Save</button>
        )}
      </div>
    </div>
  );
}
