'use client';

import { Mail, MessageCircle, Phone } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Static support page — the real contact channels only. Values come from env
// (see .env.example); a channel that isn't configured is not shown, never a
// placeholder number a store owner might try to call.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || null;
// Digits only, with country code, for wa.me (e.g. 919876543210).
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, '') || null;

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I accept a new order?',
    a: 'New orders appear under Orders with a "Placed" status. Open the order and mark it Packed once it\'s ready — a rider is dispatched automatically after that.',
  },
  {
    q: 'When do I get paid?',
    a: 'Payouts are settled weekly to the payout account you add under Settings → Payouts. Gloceries confirms the account before your first payout. Each payout shows the gross, commission deducted, and net amount.',
  },
  {
    q: 'How do I mark my store closed?',
    a: 'Use the online/offline toggle at the top of the Overview page, or set your opening hours under Settings → Store hours.',
  },
  {
    q: 'A product is out of stock — what do I do?',
    a: 'Open Inventory, find the product, and set its stock status to Out of stock. It stops showing to customers until you restock it.',
  },
];

function ContactCard({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-hairline bg-white p-4 transition-colors hover:bg-neutral-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="truncate text-sm font-medium text-neutral-900">{value}</p>
      </div>
    </a>
  );
}

export default function HelpPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {SUPPORT_WHATSAPP || SUPPORT_PHONE || SUPPORT_EMAIL ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SUPPORT_WHATSAPP && <ContactCard icon={MessageCircle} label="WhatsApp" value="Chat with us" href={`https://wa.me/${SUPPORT_WHATSAPP}`} />}
          {SUPPORT_PHONE && <ContactCard icon={Phone} label="Call" value={SUPPORT_PHONE} href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} />}
          {SUPPORT_EMAIL && <ContactCard icon={Mail} label="Email" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />}
        </div>
      ) : (
        <Card className="p-6 text-sm text-neutral-500">Contact details will appear here soon.</Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-black">Frequently asked</h2>
        <div className="mt-2 flex flex-col">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-hairline py-4 last:border-b-0">
              <p className="text-[15px] font-medium text-neutral-900">{f.q}</p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">{f.a}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
