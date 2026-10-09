// Store verification — exactly what the partner app's Store Setup wizard
// collects (backend/src/routes/storeOnboarding.ts), so nothing here asks
// for a document the applicant was never given a field for. PAN is the one
// document the wizard requires; FSSAI and Shop & Establishment are expected
// for a grocery shop but optional in the wizard; GSTIN and Udyam are
// optional. Payout details are collected after approval (partner app), not
// here. Pharmacy gets its own section: the wizard collects the drug
// licence (migration 114) and approval refuses a pharmacy without one.

import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Application } from '@/lib/types';

type DocStatus = 'verified' | 'missing' | 'not_required';

interface DocRow {
  label: string;
  why: string;
  status: DocStatus;
  value?: string;
}

const STATUS_CONFIG: Record<DocStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  verified: { icon: CheckCircle2, className: 'text-success', label: 'Submitted' },
  missing: { icon: AlertCircle, className: 'text-danger', label: 'Missing' },
  not_required: { icon: MinusCircle, className: 'text-muted', label: 'Optional — not given' },
};

export function DocumentChecklist({ application }: { application: Application }) {
  const isPharmacy = application.category === 'Pharmacy';

  const optional = (value: string | undefined): DocStatus => (value ? 'verified' : 'not_required');
  const rows: DocRow[] = [
    {
      label: "Owner's PAN",
      why: 'Required by the wizard — identity and tax/payout compliance.',
      status: application.panNumber ? 'verified' : 'missing',
      value: application.panNumber,
    },
    {
      label: 'FSSAI license/registration',
      why: 'Legally mandatory for any business selling food/groceries in India, even small kirana stores.',
      status: application.fssaiNumber ? 'verified' : 'missing',
      value: application.fssaiNumber,
    },
    {
      label: 'Shop & Establishment license',
      why: 'Local municipal registration — standard requirement for any physical shop.',
      status: application.shopEstablishmentNumber ? 'verified' : 'missing',
      value: application.shopEstablishmentNumber,
    },
    {
      label: 'GSTIN',
      why: 'Only required above the GST turnover threshold — optional in the wizard.',
      status: optional(application.gstNumber),
      value: application.gstNumber,
    },
    {
      label: 'Udyam registration',
      why: 'MSME registration — optional.',
      status: optional(application.udyamNumber),
      value: application.udyamNumber,
    },
    {
      label: 'Storefront photo',
      why: "Ties into Gloceries's real-photo trust strategy.",
      status: application.photoUrl ? 'verified' : 'missing',
    },
    {
      label: 'Store location pin',
      why: 'Without a map pin the store is invisible to nearby customers.',
      status: application.lat != null && application.lng != null ? 'verified' : 'missing',
      value: application.lat != null && application.lng != null ? `${application.lat.toFixed(5)}, ${application.lng.toFixed(5)}` : undefined,
    },
  ];

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
