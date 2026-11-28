'use client';

// Small drag-to-reorder list (HTML5 drag and drop) with keyboard-friendly
// move/remove buttons as a fallback.
import { useState } from 'react';

export function DragList<T extends string>({ items, label, onChange, render, onRemove }: {
  items: T[]; label: string; onChange: (next: T[]) => void; render: (item: T, index: number) => React.ReactNode; onRemove?: (index: number) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved!); onChange(next);
  };
  return (
    <ol aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} draggable onDragStart={() => setDragging(index)} onDragEnd={() => setDragging(null)}
          onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragging != null) move(dragging, index); setDragging(null); }}
          className={`flex cursor-grab items-center gap-1 rounded-lg border bg-white px-2 py-1 text-xs ${dragging === index ? 'border-brand opacity-60' : 'border-border'}`}>
          <span className="text-muted">{index + 1}.</span>{render(item, index)}
          <button type="button" aria-label="Move left" onClick={() => move(index, index - 1)} className="px-0.5 text-muted hover:text-ink">‹</button>
          <button type="button" aria-label="Move right" onClick={() => move(index, index + 1)} className="px-0.5 text-muted hover:text-ink">›</button>
          {onRemove && <button type="button" aria-label="Remove" onClick={() => onRemove(index)} className="px-0.5 text-muted hover:text-danger">×</button>}
        </li>
      ))}
    </ol>
  );
}
