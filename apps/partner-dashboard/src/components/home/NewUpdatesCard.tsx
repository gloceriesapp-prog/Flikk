'use client';

import Link from 'next/link';
import { ArrowUpRight, Bell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getNotificationItems } from '@/components/notifications/notificationItems';
import { useStoreContext } from '@/lib/storeContext';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';

export function NewUpdatesCard() {
  const { newOrderCount } = useStoreContext();
  const items = getNotificationItems(newOrderCount, DEMO_DATA_ENABLED);

  return <Card className="flex h-full min-w-0 flex-col p-5 sm:p-6">
    <div className="mb-2 flex h-9 items-center gap-2.5">
      <Bell size={19} strokeWidth={1.7} className="shrink-0 text-black" aria-hidden />
      <h2 className="text-[18px] font-semibold tracking-tight text-ink">New updates</h2>
      <span aria-label={`${items.length} updates`} className="tnum -ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-[8px] bg-red-600 px-1.5 text-[11px] font-semibold text-white">{items.length}</span>
    </div>
    {items.length ? <ul className="divide-y divide-slate-200/80">
      {items.map(item => <li key={item.id}>
        <Link href={item.href} className="group flex items-start gap-3 rounded-lg py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold leading-5 text-ink">{item.title}</h3>
            <p className="mt-1.5 text-[13px] font-medium leading-5 text-slate-500">{item.description}</p>
          </div>
          <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-slate-400 group-hover:text-black" aria-hidden />
        </Link>
      </li>)}
    </ul> : <div className="flex flex-1 flex-col justify-center py-8">
      <p className="text-[14px] font-semibold text-ink">You’re all caught up</p>
      <p className="mt-1 text-[13px] leading-5 text-slate-500">New order alerts will appear here.</p>
    </div>}
  </Card>;
}
