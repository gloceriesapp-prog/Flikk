// Store verification — what's legally required before a store can go
// live, not a generic "upload some files" checklist. GSTIN is
// conditional (only above the ₹40L turnover threshold — most small
// kirana stores are legitimately exempt, not delinquent) rather than
// mandatory like everything else here. Pharmacy gets its own separate,
// stricter section (Drug License, state Drug Control authority) instead
// of being folded into the general list — a pharmacy missing its license
// is a different severity of problem than a kirana store missing a
// storefront photo.

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
  not_required: { icon: MinusCircle, className: 'text-muted', label: 'Not required' },
};

export function DocumentChecklist({ application }: { application: Application }) {
  const isPharmacy = application.category === 'Pharmacy';

  const rows: DocRow[] = [
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
      why: 'Only required above the ₹40L turnover threshold — exempt below that, not optional above it.',
      status: !application.turnoverExceedsGstThreshold ? 'not_required' : application.gstNumber ? 'verified' : 'missing',
      value: application.gstNumber,
    },
    {
      label: "Owner's PAN + Aadhaar",
      why: 'Identity verification.',
      status: application.panNumber && application.aadhaarLast4 ? 'verified' : 'missing',
      value: application.panNumber && application.aadhaarLast4 ? `${application.panNumber} · Aadhaar ····${application.aadhaarLast4}` : undefined,
    },
    {
      label: 'Bank account details',
      why: 'Cancelled cheque/passbook, for weekly payout settlement.',
      status: application.bankAccountLast4 ? 'verified' : 'missing',
      value: application.bankAccountLast4 ? `Account ····${application.bankAccountLast4}` : undefined,
    },
    {
      label: 'Storefront photo',
      why: "Ties into Gloceries's real-photo trust strategy.",
      status: application.photoUrl ? 'verified' : 'missing',
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
                why: 'Separately regulated — a valid license from the state Drug Control authority, often tied to a registered pharmacist on record. Not covered by the general documents above.',
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
