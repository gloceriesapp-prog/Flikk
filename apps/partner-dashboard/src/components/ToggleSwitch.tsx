import clsx from 'clsx';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}

export function ToggleSwitch({ checked, onChange, disabled, onLabel = 'Online', offLabel = 'Offline' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex items-center gap-2.5 rounded-full border px-1.5 py-1.5 pr-3.5 transition-colors disabled:opacity-50',
        checked ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-neutral-50',
      )}
    >
      <span
        className={clsx(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-neutral-300',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>
      <span className={clsx('text-sm font-medium', checked ? 'text-emerald-700' : 'text-neutral-500')}>
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}
