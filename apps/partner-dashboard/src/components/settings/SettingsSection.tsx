// One consistent card shell for every Settings section — title/subtitle
// header, divider, then whatever the section renders. Used by all four
// sections in (dashboard)/settings/page.tsx so a future fifth section
// (e.g. notifications) slots in with zero new layout code.
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-shadow rounded-xl border border-hairline bg-white p-6">
      <div className="mb-5">
        <p className="text-base font-semibold text-black">{title}</p>
        {description && <p className="mt-0.5 text-sm text-neutral-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-neutral-400">{hint}</span>}
    </label>
  );
}
