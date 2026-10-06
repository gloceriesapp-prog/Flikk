'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSection,
  SECTION_KINDS,
  TAB_KEYS,
  validateContent,
  type HomeContentDocument,
  type HomeContentKey,
  type HomeContentRecord,
  type SectionKind,
} from '@/lib/homeContent';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { Field, inputClass, Toggle } from './Fields';
import { SectionEditor } from './SectionEditor';

const LABELS = { grocery: 'Grocery', fresh: 'Fruit & Veg', regional: 'Regional' };
type HistoryEntry = { revision: number; changed_at: string; content: HomeContentDocument };
export function HomeContentEditor() {
  const [tab, setTab] = useState<HomeContentKey>('grocery');
  const [record, setRecord] = useState<HomeContentRecord | null>(null);
  const [draft, setDraft] = useState<HomeContentDocument | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveRevision, setLiveRevision] = useState(0);
  const [addKind, setAddKind] = useState<SectionKind>('products');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const dirty = Boolean(
    draft && record && JSON.stringify(draft) !== JSON.stringify(record.content),
  );
  const state = useRef({ dirty, record, tab });
  useEffect(() => {
    state.current = { dirty, record, tab };
  }, [dirty, record, tab]);
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
        if (replace || !state.current.dirty) {
          setRecord(data);
          setDraft(data.content);
          setSelectedId((old) =>
            data.content.sections.some((section: { id: string }) => section.id === old)
              ? old
              : (data.content.sections[0]?.id ?? ''),
          );
          setError('');
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
        throw new Error(data.error);
      }
      ++requestId.current;
      setRecord(data);
      setDraft(data.content);
      setLiveRevision(data.revision);
      setHistory([]);
      setMessage(
        `Published version ${data.revision}. Customer devices receive the update automatically.`,
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
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Home tab content</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage the customer app’s Grocery, Fruit & Veg and Regional tabs. Arrange sections,
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
              state.current = { dirty: false, record: null, tab: key };
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
          {error}
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
          <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Sections</h2>
                <span className="text-xs text-slate-400">
                  {draft.sections.filter((s) => s.enabled).length} visible
                </span>
              </div>
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
                        {section.title ||
                          (section.kind === 'categories' ? 'Category tiles' : 'Image banner')}
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
                        ↑ Up
                      </button>
                      <button
                        type="button"
                        disabled={index === draft.sections.length - 1}
                        onClick={() => move(index, 1)}
                        className="disabled:opacity-20"
                        aria-label="Move section down"
                      >
                        ↓ Down
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            sections: draft.sections.map((s) =>
                              s.id === section.id ? { ...s, enabled: !s.enabled } : s,
                            ),
                          })
                        }
                      >
                        {section.enabled ? 'Hide' : 'Show'}
                      </button>
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
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <select
                  aria-label="New section type"
                  value={addKind}
                  onChange={(event) => setAddKind(event.target.value as SectionKind)}
                  className={`${inputClass} min-w-0 flex-1`}
                >
                  {SECTION_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={draft.sections.length >= 40}
                  onClick={() => {
                    const section = createSection(
                      addKind,
                      `section-${crypto.randomUUID()}`,
                      'New section',
                    );
                    setDraft({ ...draft, sections: [...draft.sections, section] });
                    setSelectedId(section.id);
                  }}
                  className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-30"
                >
                  Add
                </button>
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
