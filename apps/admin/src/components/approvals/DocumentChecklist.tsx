// Store verification: the documents the partner app's onboarding requires
// (backend/src/routes/storeOnboarding.ts) — PAN, FSSAI for food categories,
// a storefront photo and the map pin. Optional numbers (GSTIN, Udyam, Shop &
// Establishment) are listed only when the applicant gave one, so the list
// never shows "missing" for something the app doesn't ask for. Pharmacy gets
// its own section: approval refuses a pharmacy without a drug licence.

import { AlertCircle, CheckCircle2 } from '@/components/icons';
import clsx from 'clsx';
import type { Application } from '@/lib/types';
import { FSSAI_CATEGORIES } from '@/lib/store-options';

type DocStatus = 'verified' | 'missing';

interface DocRow {
  label: string;
  why: string;
  status: DocStatus;
  value?: string;
}

const STATUS_CONFIG: Record<DocStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  verified: { icon: CheckCircle2, className: 'text-success', label: 'Submitted' },
  missing: { icon: AlertCircle, className: 'text-danger', label: 'Missing' },
};

export function DocumentChecklist({ application }: { application: Application }) {
  const isPharmacy = application.category === 'Pharmacy';

  const needsFssai = !!application.category && FSSAI_CATEGORIES.includes(application.category);
  const storePhoto = application.storeDocPhotoUrl ?? application.photoUrl;
  const hasPin = application.lat != null && application.lng != null;

  const rows: DocRow[] = [
    {
      label: "Owner's PAN",
      why: 'Required for every store — identity and tax/payout compliance.',
      status: application.panNumber ? 'verified' : 'missing',
      value: application.panNumber,
    },
  ];
  if (needsFssai || application.fssaiNumber) {
    rows.push({
      label: 'FSSAI license/registration',
      why: needsFssai ? 'Required for stores that sell food.' : 'Given by the applicant (not required for this category).',
      status: application.fssaiNumber ? 'verified' : 'missing',
      value: application.fssaiNumber,
    });
  }
  rows.push(
    {
      label: 'Storefront photo',
      why: 'Required — shown above under Verification photos.',
      status: storePhoto ? 'verified' : 'missing',
    },
    {
      label: 'Store location pin',
      why: 'Required — without a map pin the store is invisible to nearby customers.',
      status: hasPin ? 'verified' : 'missing',
      value: hasPin ? `${application.lat!.toFixed(5)}, ${application.lng!.toFixed(5)}` : undefined,
    },
  );
  const optionalDocs: [string, string | undefined][] = [
    ['GSTIN', application.gstNumber],
    ['Udyam registration', application.udyamNumber],
    ['Shop & Establishment license', application.shopEstablishmentNumber],
  ];
  for (const [label, value] of optionalDocs) {
    if (value) rows.push({ label, why: 'Optional — given by the applicant.', status: 'verified', value });
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h3 className="text-sm font-medium text-ink">Store verification — documents needed</h3>

      <div className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <DocRowItem key={row.label} row={row} />
        ))}
      </div>

      {isPharmacy && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Pharmacy — stricter verification path
            </span>
          </div>
          <div className="mt-3">
            <DocRowItem
              row={{
                label: 'Drug License',
                why: 'Separately regulated (state Drug Control authority). Required for a pharmacy — approval is blocked without it.',
                status: application.drugLicenseNumber ? 'verified' : 'missing',
                value: application.drugLicenseNumber,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DocRowItem({ row }: { row: DocRow }) {
  const { icon: Icon, className, label } = STATUS_CONFIG[row.status];
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border p-3.5">
      <Icon size={17} className={clsx('mt-0.5 shrink-0', className)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink">{row.label}</p>
          <span className={clsx('text-xs font-semibold', className)}>{label}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">{row.why}</p>
        {row.value && <p className="mt-1 text-xs font-medium text-ink-soft">{row.value}</p>}
      </div>
    </div>
  );
}
