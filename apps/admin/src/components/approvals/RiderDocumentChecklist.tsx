// Rider verification — what's legally required before a rider can start
// taking deliveries. Unlike DocumentChecklist.tsx's own store checklist
// (numbers only, the storefront photo already shows in the page's own
// hero), Aadhaar/DL photos are rendered inline here — the actual point of
// this screen is a human visually checking the photo matches the person
// and the number, not just confirming a file was uploaded.

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { Application } from '@/lib/types';

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: 'Bicycle',
  scooter: 'Scooter',
  motorcycle: 'Motorcycle',
};

export function RiderDocumentChecklist({ application }: { application: Application }) {
  const age = application.dateOfBirth ? calcAge(application.dateOfBirth) : null;

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
      <h3 className="text-sm font-medium text-ink">Rider verification</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date of birth" value={application.dateOfBirth ? `${application.dateOfBirth}${age !== null ? ` (${age} yrs)` : ''}` : '—'} />
        <Field label="Home address" value={application.homeAddress ?? '—'} />
        <Field label="Vehicle" value={applicationVehicleLabel(application)} />
        <Field
          label="Emergency contact"
          value={
            application.emergencyContactName
              ? `${application.emergencyContactName} (${application.emergencyContactRelationship ?? '—'}) · ${application.emergencyContactPhone ?? '—'}`
              : '—'
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DocumentPhoto label="Aadhaar" number={application.aadhaarNumber} photoUrl={application.aadhaarPhotoUrl} />
        <DocumentPhoto label="Driving licence" number={application.dlNumber} photoUrl={application.dlPhotoUrl} />
      </div>
    </div>
  );
}

function applicationVehicleLabel(application: Application): string {
  if (!application.vehicleType) return '—';
  const label = VEHICLE_LABEL[application.vehicleType] ?? application.vehicleType;
  return application.vehicleNumber ? `${label} · ${application.vehicleNumber}` : label;
}

function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function DocumentPhoto({ label, number, photoUrl }: { label: string; number?: string; photoUrl?: string }) {
  const hasBoth = !!number && !!photoUrl;
  return (
    <div className="rounded-2xl border border-border p-3.5">
      <div className="flex items-center gap-2">
        {hasBoth ? <CheckCircle2 size={15} className="text-success" /> : <AlertCircle size={15} className="text-danger" />}
        <p className="text-sm font-semibold text-ink">{label}</p>
        <span className={clsx('text-xs font-semibold', hasBoth ? 'text-success' : 'text-danger')}>{hasBoth ? 'Submitted' : 'Missing'}</span>
      </div>
      {number && <p className="mt-1.5 text-xs font-medium text-ink-soft">{number}</p>}
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- real signed Storage URL, no next.config domain to register
        <img src={photoUrl} alt={`${label} photo`} className="mt-2 h-40 w-full rounded-xl object-cover" />
      ) : (
        <div className="mt-2 flex h-40 items-center justify-center rounded-xl bg-accent text-xs text-muted">No photo</div>
      )}
    </div>
  );
}
