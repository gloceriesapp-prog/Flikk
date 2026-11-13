"use client";

import { useState } from 'react';
import { createSection, SECTION_KINDS, type HomeContentSection, type SectionKind } from '@/lib/homeContent';
import { Field, inputClass } from './Fields';
import { SECTION_KIND_LABELS, type SectionPlacement } from './sectionInsertion';

export function SectionComposer({ sections, selectedId, onAdd }: {
  sections: HomeContentSection[]; selectedId: string;
  onAdd: (section: HomeContentSection, placement: SectionPlacement) => void;
}) {
  const [kind, setKind] = useState<SectionKind>('products');
  const [title, setTitle] = useState('');
  const [placement, setPlacement] = useState<SectionPlacement>('after');
  const selected = sections.find(section => section.id === selectedId);
  const effectivePlacement = selected ? placement : 'end';
  const full = sections.length >= 40;
  function add(nextKind: SectionKind) {
    if (full) return;
    const heading = nextKind === 'banner' ? (nextKind === kind ? title.trim() : '') : title.trim() || 'New section';
    const section = createSection(nextKind, `section-${crypto.randomUUID()}`, heading);
    onAdd(section, effectivePlacement);
    setTitle('');
  }
  return <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <h3 className="text-sm font-semibold text-slate-900">Add content</h3>
    <Field label="Section type">
      <select aria-label="New section type" value={kind} onChange={event => setKind(event.target.value as SectionKind)} className={inputClass}>
        {SECTION_KINDS.map(value => <option key={value} value={value}>{SECTION_KIND_LABELS[value]}</option>)}
      </select>
    </Field>
    <Field label={kind === 'banner' ? 'Ad heading (optional)' : 'Section title'}>
      <input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} placeholder={kind === 'banner' ? 'Leave blank for image only' : 'e.g. Udupi favourites'} className={inputClass} />
    </Field>
    <Field label="Show this content">
      <select value={effectivePlacement} onChange={event => setPlacement(event.target.value as SectionPlacement)} className={inputClass}>
        <option value="before" disabled={!selected}>Before selected section</option>
        <option value="after" disabled={!selected}>After selected section</option>
        <option value="end">At the end of this tab</option>
      </select>
    </Field>
    {selected && placement !== 'end' ? <p className="break-words text-xs text-slate-500">Selected: {selected.title || SECTION_KIND_LABELS[selected.kind]}</p> : null}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={full} onClick={() => add(kind)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Add section</button>
      <button type="button" disabled={full} onClick={() => add('banner')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40">Add image ad</button>
    </div>
    <p className="text-xs leading-5 text-slate-500">Add multiple ads anywhere between sections. Upload each image in its editor, use Up / Down to reposition it, and publish when ready. {sections.length}/40 sections.</p>
  </div>;
}
