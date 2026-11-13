'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown } from '@/components/icons';
import {
  addMissingFestivalSections,
  createFestivalSections,
  TAB_KEYS,
  validateContent,
  type HomeContentDocument,
  type HomeContentKey,
  type HomeContentRecord,
} from '@/lib/homeContent';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { Field, inputClass, Toggle } from './Fields';
import { SectionEditor } from './SectionEditor';
import { missingReferenceSummary, parseMissingReferences, removeMissingReferences, type MissingReferences } from './missingReferences';
import { SectionComposer } from './SectionComposer';
import { insertContentSection, SECTION_KIND_LABELS } from './sectionInsertion';

const LABELS = { grocery: 'Grocery', fresh: 'Fruit & Veg', regional: 'Udupi / Regional', festivals: 'Festivals', meat: 'Meat' };
const kindLabel = (kind: keyof typeof SECTION_KIND_LABELS) => SECTION_KIND_LABELS[kind];
type HistoryEntry = { revision: number; changed_at: string; content: HomeContentDocument };
export function HomeContentEditor({ initialTab = 'grocery' }: { initialTab?: HomeContentKey }) {
  const [tab, setTab] = useState<HomeContentKey>(initialTab);
  const [record, setRecord] = useState<HomeContentRecord | null>(null);
  const [draft, setDraft] = useState<HomeContentDocument | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [missingReferences, setMissingReferences] = useState<MissingReferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveRevision, setLiveRevision] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const dirty = Boolean(
    draft && record && JSON.stringify(draft) !== JSON.stringify(record.content),
  );
  const state = useRef({ dirty, record, tab, repairNeeded: false });
  useEffect(() => {
    state.current = { dirty, record, tab, repairNeeded: missingReferences !== null };
  }, [dirty, record, tab, missingReferences]);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const load = useCallback(
    async (replace = false) => {
      const id = ++requestId.current;
      try {
        const response = await fetch(`/api/home-content/${tab}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!mounted.current || id !== requestId.current || state.current.tab !== tab) return;
        // Never roll back a newer successful save with a late GET response.
        if (state.current.record?.tabKey === tab && data.revision < state.current.record.revision)
          return;
        setLiveRevision(data.revision);
        if (replace || (!state.current.dirty && !state.current.repairNeeded)) {
          setRecord(data);
          setDraft(data.content);
          setSelectedId((old) =>
            data.content.sections.some((section: { id: string }) => section.id === old)
              ? old
              : (data.content.sections[0]?.id ?? ''),
          );
          setError('');
          setMissingReferences(null);
        }
      } catch (err) {
        if (mounted.current && id === requestId.current)
          setError(err instanceof Error ? err.message : 'Could not load Home content.');
      } finally {
        if (mounted.current && id === requestId.current) setLoading(false);
      }
    },
    [tab],
  );
  const { connected } = useAdminRealtime(() => void load());
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => load(true));
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 20_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (state.current.dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  async function publish() {
    if (!record || !draft) return;
    setError('');
    setMessage('');
    setMissingReferences(null);
    let content: HomeContentDocument;
    try {
      content = validateContent(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check your content.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/home-content/${tab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: record.revision, content }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) setLiveRevision(record.revision + 1);
        if (data.code === 'CATALOGUE_REFERENCES_MISSING') setMissingReferences(parseMissingReferences(data.missingReferences));
        throw new Error(data.error);
      }
      ++requestId.current;
      setRecord(data);
      setDraft(data.content);
      setLiveRevision(data.revision);
      setHistory([]);
      setMessage(
        `Published version ${data.revision}. ${data.repairedReferences ? 'Removed unavailable selections from the previous saved version; valid products were preserved. ' : ''}Customer devices receive the update automatically.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish.');
    } finally {
      setSaving(false);
    }
  }
  async function loadHistory() {
    try {
      const response = await fetch(`/api/home-content/${tab}?history=1`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!mounted.current || state.current.tab !== tab) return;
      setHistory(data);
    } catch (err) {
      if (mounted.current && state.current.tab === tab)
        setError(err instanceof Error ? err.message : 'Could not load history.');
    }
  }
  function move(index: number, delta: number) {
    if (!draft) return;
    const sections = [...draft.sections];
    [sections[index], sections[index + delta]] = [sections[index + delta], sections[index]];
    setDraft({ ...draft, sections });
  }
  const selected = draft?.sections.find((section) => section.id === selectedId);
  const conflict = Boolean(record && liveRevision > record.revision);
  const missingSummary = draft && missingReferences ? missingReferenceSummary(draft, missingReferences) : [];
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Home tab content</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage the customer app’s Grocery, Fruit & Veg, Regional, Festivals and Meat tabs. Arrange sections,
            choose real catalogue products, and edit the text and images customers see.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
        >
          {connected ? 'Live sync connected' : 'Reconnecting · periodic sync active'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TAB_KEYS.map((key) => (
          <button
            type="button"
            key={key}
            disabled={saving || (dirty && key !== tab)}
            onClick={() => {
              if (key === tab) return;
              ++requestId.current;
              state.current = { dirty: false, record: null, tab: key, repairNeeded: false };
              setRecord(null);
              setDraft(null);
              setLoading(true);
              setHistory([]);
              setMessage('');
              setTab(key);
            }}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-40 ${tab === key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {LABELS[key]}
          </button>
        ))}
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          {missingReferences && missingSummary.length > 0 && <>
            <ul className="my-3 max-h-56 space-y-1 overflow-auto">
              {missingSummary.map((entry, index) => <li key={`${entry.sectionId}:${index}`}>
                <button type="button" className="text-left underline" onClick={() => setSelectedId(entry.sectionId)}>
                  {entry.label}{entry.hidden ? ' (hidden section)' : ''} · {entry.count} unavailable selection{entry.count === 1 ? '' : 's'}
                </button>
              </li>)}
            </ul>
            <button type="button" disabled={saving} className="min-h-11 rounded-xl bg-white px-4 py-2 font-semibold disabled:opacity-50"
              onClick={() => {
                setDraft(current => current ? removeMissingReferences(current, missingReferences) : current);
                setMissingReferences(null); setError('');
                setMessage('Unavailable selections removed from the draft. Valid selections are preserved. Review and publish to save.');
              }}>Remove unavailable selections from draft</button>
          </>}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}
      {conflict && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          A newer version is live. Your draft has been preserved. Use “Discard & reload” to load it
          before publishing.
        </div>
      )}
      {loading && !draft && (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Loading {LABELS[tab]} content…
        </p>
      )}
      {!draft && !loading && (
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load(true);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      )}
      {draft && record && (
        <fieldset disabled={saving} className="space-y-6 disabled:opacity-70">
          <div className="flex flex-wrap items-end gap-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="min-w-52 flex-1">
              <Field label="Home header label">
                <input
                  value={draft.tabTitle}
                  maxLength={32}
                  onChange={(event) => setDraft({ ...draft, tabTitle: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="pb-3">
              <Toggle
                label="Show this tab"
                checked={draft.enabled}
                onChange={(enabled) => setDraft({ ...draft, enabled })}
              />
            </div>
            <div className="text-xs leading-5 text-slate-400">
              Version {record.revision}
              <br />
              Published {new Date(record.updatedAt).toLocaleString()}
            </div>
          </div>
          {tab === 'festivals' && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="max-w-2xl text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Festival sections</p>
                <p className="mt-1">Manage puja, flowers, sweets, fruit, lights, decor, local shops and offers here.
                  Add missing sections to your draft, edit their products and order, then publish.
                  Existing sections and selections are preserved.</p>
                <a className="mt-2 inline-block font-medium underline" href="/festival-greeting">Edit seasonal artwork and greeting</a>
              </div>
              <button type="button" disabled={createFestivalSections().every(item => draft.sections.some(section => section.id === item.id))}
                onClick={() => {
                  const next = addMissingFestivalSections(draft);
                  if (next.sections.length > 40) { setError('Remove unused sections before adding the festival layout (maximum 40 sections).'); return; }
                  setDraft(next);
                  setSelectedId('festival-puja');
                  setMessage('Festival sections added to draft. Review and publish to make them live.');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-40">
                Add missing festival sections
              </button>
            </div>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Sections</h2>
                <span className="text-xs text-slate-400">
                  {draft.sections.filter((s) => s.enabled).length} visible
                </span>
              </div>
              <SectionComposer sections={draft.sections} selectedId={selectedId} onAdd={(section, placement) => {
                setDraft({ ...draft, sections: insertContentSection(draft.sections, section, selectedId, placement) });
                setSelectedId(section.id);
                setMessage(section.kind === 'banner' ? 'Image ad added to draft. Upload its image, check visibility and publish when ready.' : 'Section added to draft. Choose its content and publish when ready.');
              }} />
              <div className="space-y-2">
                {draft.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`rounded-xl border p-3 ${selectedId === section.id ? 'border-blue-200 bg-blue-50' : 'border-slate-100'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(section.id)}
                      className="w-full text-left"
                    >
                      <span
                        className={`block text-sm font-semibold ${section.enabled ? 'text-slate-800' : 'text-slate-400'}`}
                      >
                        {section.title || kindLabel(section.kind)}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {section.kind} · {section.enabled ? 'visible' : 'hidden'}
                      </span>
                    </button>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="disabled:opacity-20"
                        aria-label="Move section up"
                      >
                        <ArrowUp size={14} className="inline-block" /> Up
                      </button>
                      <button
                        type="button"
                        disabled={index === draft.sections.length - 1}
                        onClick={() => move(index, 1)}
                        className="disabled:opacity-20"
                        aria-label="Move section down"
                      >
                        <ArrowDown size={14} className="inline-block" /> Down
                      </button>
                      <Toggle label="Visible" checked={section.enabled} onChange={enabled => setDraft({
                        ...draft, sections: draft.sections.map(item => item.id === section.id ? { ...item, enabled } : item),
                      })} />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            sections: draft.sections.filter((s) => s.id !== section.id),
                          })
                        }
                        className="ml-auto text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              {selected ? (
                <SectionEditor
                  key={`${tab}-${selected.id}-${record.revision}`}
                  value={selected}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((s) => (s.id === value.id ? value : s)),
                    })
                  }
                />
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  Select or add a section to edit its content.
                </p>
              )}
            </main>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {dirty
                  ? 'Unpublished changes. Publish or discard before changing tabs.'
                  : 'All changes are published.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMessage('');
                    void load(true);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Discard & reload
                </button>
                <button
                  type="button"
                  disabled={!dirty || saving || conflict}
                  onClick={() => void publish()}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? 'Publishing…' : 'Publish to customer app'}
                </button>
              </div>
            </div>
          </div>
          <details
            className="rounded-2xl border border-slate-200 bg-white p-5"
            onToggle={(event) => {
              if (event.currentTarget.open) void loadHistory();
            }}
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Publish history & restore
            </summary>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Restore loads an earlier version into your draft. Review it and publish to make it
              live.
            </p>
            <div className="mt-3 space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.revision}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
                >
                  <span>
                    Version {entry.revision} · {new Date(entry.changed_at).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    disabled={entry.revision === record.revision}
                    onClick={() => {
                      setDraft(entry.content);
                      setSelectedId(entry.content.sections[0]?.id ?? '');
                      setMessage(
                        `Version ${entry.revision} loaded into draft. Review and publish to restore.`,
                      );
                    }}
                    className="font-semibold text-blue-600 disabled:text-slate-400"
                  >
                    Restore to draft
                  </button>
                </div>
              ))}
            </div>
          </details>
        </fieldset>
      )}
    </div>
  );
}
