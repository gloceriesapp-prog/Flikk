'use client';

// Version history: who saved what and when, which version is live, restore.
import type { VersionSummary } from './useTodayGridDraft';

export function VersionsPanel({ versions, onRestore, busy }: { versions: VersionSummary[]; onRestore: (id: number) => void; busy: boolean }) {
  if (!versions.length) return <p className="text-xs text-muted">No saved versions yet. Save a draft to start the history.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border text-xs">
      {versions.map((v) => (
        <li key={v.id} className="flex flex-wrap items-start gap-2 py-2">
          <span className="font-semibold text-ink">v{v.id}</span>
          {v.live && <span className="rounded bg-success/10 px-1.5 text-success">Live</span>}
          <span className="text-muted">{new Date(v.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {v.createdBy}</span>
          <span className="text-muted">{v.note ?? `${v.changes} change${v.changes === 1 ? '' : 's'}`}</span>
          <details className="w-full text-muted"><summary className="cursor-pointer">What changed</summary>
            <ul className="mt-1 font-mono text-[10px]">{v.diff.slice(0, 30).map((d) => <li key={d.path}>{d.path}: {JSON.stringify(d.from)} → {JSON.stringify(d.to)}</li>)}</ul></details>
          {!v.live && <button type="button" disabled={busy} onClick={() => onRestore(v.id)} className="ml-auto rounded border border-border px-2 py-0.5 text-ink hover:bg-canvas disabled:opacity-40">Restore as draft</button>}
        </li>
      ))}
    </ul>
  );
}
