// Veg / non-veg mark for a product (products.is_veg). Optional: "Not set"
// (null) shows no mark at all in the customer app, so nothing is labelled
// veg or non-veg unless someone chose it here.

const OPTIONS: { value: boolean | null; label: string; active: string }[] = [
  { value: null, label: 'Not set', active: 'bg-mist text-ink' },
  { value: true, label: 'Veg', active: 'bg-success/10 text-success' },
  { value: false, label: 'Non-veg', active: 'bg-danger/10 text-danger' },
];

export function VegChoice({ value, onChange }: { value: boolean | null | undefined; onChange: (value: boolean | null) => void }) {
  const current = value ?? null;
  return (
    <div role="radiogroup" aria-label="Veg or non-veg" className="flex items-center gap-2 rounded-xl border border-border p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={current === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${current === option.value ? option.active : 'text-muted'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
