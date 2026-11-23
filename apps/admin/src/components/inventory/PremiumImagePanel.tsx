'use client';

// "Image style" for a product: Standard (rembg cut-out, the default) or
// Premium background (Photoroom, api/product-images/premium). Premium: the
// preset for the product's category is pre-selected; pick another or edit
// the background description (the safety text is fixed), Generate, compare
// with the standard photo, then "Use this one" (as the second gallery photo
// or the main photo) or "Try again". Earlier premium photos stay listed, so
// the product can switch either way at any time without a new upload.
// Hidden entirely when the server has no Photoroom key.

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from '@/components/icons';
import type { PremiumAttempt, PremiumState } from '@/app/api/product-images/premium/route';
import {
  CATEGORY_PRESET_IDS, COST_NOTE, DEFAULT_PASTEL, DEFAULT_TEXT_BG, DEFAULT_TEXT_COLOR, HEADLINE_MAX, PRESETS, PRESET_IDS, PROMPT_BASE_MAX, REQUIRED_PROMPT,
  categoryPreset, cleanPromptBase, headlineLines, presetBase, type PresetId,
} from '@/lib/photoroomPresets';
import { renderHeadline } from './renderHeadline';

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

const OTHER_PRESET_IDS = PRESET_IDS.filter((id) => !CATEGORY_PRESET_IDS.includes(id));
type Placement = 'gallery' | 'main';

function PresetPicker({ preset, color, suggested, onChange }: { preset: PresetId; color: string; suggested: PresetId; onChange: (preset: PresetId, color: string) => void }) {
  const option = (id: PresetId) => <option key={id} value={id}>{PRESETS[id].label}{id === suggested ? ' (this category)' : ''}</option>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={(e) => onChange(e.target.value as PresetId, color)}
        className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-xs text-ink"
        aria-label="Premium background"
      >
        <optgroup label="Category backgrounds">{CATEGORY_PRESET_IDS.map(option)}</optgroup>
        <optgroup label="Other styles">{OTHER_PRESET_IDS.map(option)}</optgroup>
      </select>
      {preset === 'pastel' && (
        <input type="color" value={color} onChange={(e) => onChange(preset, e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-border" aria-label="Pastel colour" />
      )}
    </div>
  );
}

// The background description: the first part is editable, the safety
// text after it is fixed (also added by the server, so it can't be removed).
function PromptField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const valid = cleanPromptBase(value) !== null;
  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, ' '))}
        rows={2}
        maxLength={PROMPT_BASE_MAX}
        aria-label="Background description"
        className="w-full resize-none rounded-[10px] border border-border px-3 py-2 text-xs text-ink"
      />
      <p className="text-[11px] text-muted">
        <span className="font-medium">Always added:</span> {REQUIRED_PROMPT}
      </p>
      {!valid && <p className="text-[11px] text-danger">Describe the background in 3 to {PROMPT_BASE_MAX} characters.</p>}
    </div>
  );
}

function PlacementRadios({ value, onChange, disabled }: { value: Placement; onChange: (value: Placement) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink">
      <span className="text-muted">Show it as</span>
      {(['gallery', 'main'] as const).map((id) => (
        <label key={id} className="flex items-center gap-1.5">
          <input type="radio" name="premium-placement" checked={value === id} disabled={disabled} onChange={() => onChange(id)} />
          {id === 'gallery' ? 'Second gallery photo (default)' : 'Main photo'}
        </label>
      ))}
    </div>
  );
}

// Text headline: the words, its colours, and a live preview of the
// background (the product goes over the dashed area).
function HeadlineFields({ canvasRef, headline, background, color, onChange }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  headline: string;
  background: string;
  color: string;
  onChange: (next: { headline?: string; background?: string; color?: string }) => void;
}) {
  const lines = headlineLines(headline);
  useEffect(() => { if (canvasRef.current) void renderHeadline(canvasRef.current, lines ?? [], background, color); });
  return (
    <div className="flex gap-3">
      <div className="flex flex-1 flex-col gap-2">
        <textarea
          value={headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          rows={2}
          maxLength={HEADLINE_MAX + 1}
          placeholder={'e.g. FRESH\nDEALS'}
          aria-label="Headline text"
          className="w-full resize-none rounded-[10px] border border-border px-3 py-2 text-sm font-semibold uppercase text-ink"
        />
        <p className={`text-[11px] ${headline.trim() && !lines ? 'text-danger' : 'text-muted'}`}>
          Up to 2 lines, {HEADLINE_MAX} characters. Press Enter for a new line, or one long line is split for you.
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <label className="flex items-center gap-1.5">Background <input type="color" value={background} onChange={(e) => onChange({ background: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-border" /></label>
          <label className="flex items-center gap-1.5">Text <input type="color" value={color} onChange={(e) => onChange({ color: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-border" /></label>
        </div>
      </div>
      <div className="relative w-[120px] shrink-0">
        <canvas ref={canvasRef} className="aspect-[8/9] w-full rounded-xl border border-border" aria-label="Headline preview" />
        {/* Where Photoroom places the product (TEXT_PADDING). */}
        <span className="pointer-events-none absolute rounded-md border border-dashed border-ink/30" style={{ left: '8.3%', right: '8.3%', top: '34.6%', bottom: '8.8%' }} />
      </div>
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
export function ImageStyleChoiceField({ value, category, onChange }: { value: ImageStyleChoice; category?: string; onChange: (value: ImageStyleChoice) => void }) {
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
        onChange={(next) => onChange(next ? { style: 'premium', preset: categoryPreset(category), color: null } : { style: 'standard' })}
      />
      {value.style === 'premium' && (
        <>
          <PresetPicker preset={value.preset} color={value.color ?? DEFAULT_PASTEL} suggested={categoryPreset(category)} onChange={(preset, color) => onChange({ style: 'premium', preset, color: preset === 'pastel' ? color : null })} />
          <p className="text-[11px] text-muted">{value.preset === 'text' ? 'After you add the product you type the headline, generate and compare it with the standard photo.' : 'After you add the product you can generate and compare it with the standard photo.'}</p>
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
  onApplied: (photos: { imageUrl: string | null; extraImageUrls: string[] }) => void;
}) {
  const [state, setState] = useState<PremiumState | null>(null);
  const [premium, setPremium] = useState(Boolean(start));
  // null until picked: the category's preset (state.suggestedPreset).
  const [picked, setPicked] = useState<PresetId | null>(start?.preset ?? null);
  const [promptDraft, setPromptDraft] = useState<string | null>(null);
  const [placementDraft, setPlacementDraft] = useState<Placement | null>(null);
  const [color, setColor] = useState(start?.color ?? DEFAULT_PASTEL);
  const [preview, setPreview] = useState<PremiumAttempt | null>(null);
  const [busy, setBusy] = useState<'generate' | 'use' | 'cap' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capDraft, setCapDraft] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [textBg, setTextBg] = useState(DEFAULT_TEXT_BG);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    void Promise.resolve().then(() => loadState(productId)).then((next) => {
      setState(next);
      if (next?.style === 'premium') setPremium(true);
    });
  }, [productId]);

  if (!state?.enabled) return null;
  const preset = picked ?? state.suggestedPreset;
  const prompt = promptDraft ?? presetBase(preset, color);
  const placement = placementDraft ?? state.placement ?? 'gallery';

  async function post(action: 'generate' | 'use' | 'cap', payload: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch('/api/product-images/premium', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, productId, ...payload }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; state?: PremiumState; imageUrl?: string | null; extraImageUrls?: string[] } & Partial<PremiumState>;
      const next = body.state ?? (action === 'cap' && res.ok ? { ...state!, used: body.used!, cap: body.cap!, capMessage: body.capMessage ?? null } : null);
      if (next) setState(next);
      if (!res.ok) setError(body.error ?? 'Something went wrong.');
      return { ok: res.ok, next, photos: body.extraImageUrls ? { imageUrl: body.imageUrl ?? null, extraImageUrls: body.extraImageUrls } : null };
    } catch {
      setError('Network error. Try again.');
      return { ok: false, next: null, photos: null };
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    let text = {};
    if (preset === 'text') {
      const lines = headlineLines(headline);
      if (!lines || !canvasRef.current) { setError('Type a headline: up to 2 lines, 40 characters.'); return; }
      await renderHeadline(canvasRef.current, lines, textBg, textColor);
      text = { headline: lines.join('\n'), textColor, background: canvasRef.current.toDataURL('image/png') };
    }
    if (preset !== 'text' && !cleanPromptBase(prompt)) { setError(`Describe the background in 3 to ${PROMPT_BASE_MAX} characters.`); return; }
    const { ok, next } = await post('generate', {
      preset, color: preset === 'pastel' ? color : preset === 'text' ? textBg : null, ...(preset === 'text' ? text : { prompt }),
    });
    setPreview(ok ? next?.attempts.find((a) => a.status === 'done') ?? null : null);
  }

  async function use(attempt: PremiumAttempt | null, where: Placement = placement) {
    const { ok, photos } = await post('use', { attemptId: attempt?.id ?? null, placement: where });
    if (ok && photos) {
      onApplied(photos);
      setPreview(null);
      if (!attempt) setPremium(false);
    }
  }

  const done = state.attempts.filter((a) => a.status === 'done');
  const shown = preview ?? done.find((a) => a.url === state.premiumUrl) ?? null;
  const label = (a: PremiumAttempt) => a.headline ? `“${a.headline}”` : a.prompt ?? PRESETS[a.preset as PresetId]?.label ?? a.preset;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">Image style <span className="font-normal text-muted">· now {state.placement === 'main' ? 'Premium main photo' : state.placement === 'gallery' ? 'Standard main, premium 2nd photo' : 'Standard'}</span></p>
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
            <PresetPicker preset={preset} color={color} suggested={state.suggestedPreset} onChange={(p, c) => { setPicked(p); setColor(c); setPromptDraft(null); }} />
            <button
              type="button"
              onClick={generate}
              disabled={busy !== null || !!state.capMessage || !imageUrl || (preset === 'text' ? !headlineLines(headline) : !cleanPromptBase(prompt))}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-strong disabled:opacity-40"
            >
              {busy === 'generate' && <Loader2 size={12} className="animate-spin" />}
              {busy === 'generate' ? 'Generating…' : preview ? 'Try again' : 'Generate'}
            </button>
          </div>
          {preset !== 'text' && <PromptField value={prompt} onChange={setPromptDraft} />}
          <PlacementRadios
            value={placement}
            disabled={busy !== null}
            onChange={(next) => {
              setPlacementDraft(next);
              // Move the photo in use right away; a new one waits for "Use this one".
              const current = done.find((a) => a.url === state.premiumUrl);
              if (current && !preview && state.placement && state.placement !== next) void use(current, next);
            }}
          />
          {preset === 'text' && (
            <HeadlineFields
              canvasRef={canvasRef}
              headline={headline}
              background={textBg}
              color={textColor}
              onChange={(next) => {
                if (next.headline !== undefined) setHeadline(next.headline);
                if (next.background) setTextBg(next.background);
                if (next.color) setTextColor(next.color);
              }}
            />
          )}
          {state.capMessage && <p className="text-[11px] font-medium text-amber-600">{state.capMessage}</p>}

          {(shown || busy === 'generate') && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <Photo url={state.standardUrl} label="Standard (rembg)" />
                {busy === 'generate'
                  ? <div className="flex aspect-[8/9] flex-1 items-center justify-center rounded-xl border border-border"><Loader2 size={18} className="animate-spin text-muted" /></div>
                  : <Photo url={shown?.url ?? null} label={`Premium · ${shown ? label(shown) : ''}`} />}
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
                  <button key={a.id} type="button" onClick={() => setPreview(a)} title={label(a)}
                    className={`h-14 w-[50px] overflow-hidden rounded-lg border ${a.url === state.premiumUrl ? 'border-brand ring-2 ring-brand/30' : 'border-border'}`}>
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
