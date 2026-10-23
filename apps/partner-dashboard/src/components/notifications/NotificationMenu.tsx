'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, X } from 'lucide-react';
import { NotificationBell } from '@/components/icons/NotificationBell';
import { useStoreContext } from '@/lib/storeContext';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { getNotificationItems } from './notificationItems';

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { newOrderCount } = useStoreContext();
  const items = getNotificationItems(newOrderCount, DEMO_DATA_ENABLED);
  const close = () => dialog.current?.close();

  return <>
    <button ref={trigger} type="button" aria-label="Notifications" aria-haspopup="dialog" aria-expanded={open} aria-controls="store-notifications" onClick={() => { dialog.current?.showModal(); setOpen(true); }}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 aria-expanded:border-accent aria-expanded:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <NotificationBell active={newOrderCount > 0} size={22} />
      {newOrderCount > 0 && <span className="tnum absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">{newOrderCount > 9 ? '9+' : newOrderCount}</span>}
    </button>
    <dialog ref={dialog} id="store-notifications" aria-labelledby="notifications-title" onClose={() => { setOpen(false); trigger.current?.focus(); }}
      onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}
      className="fixed bottom-auto left-auto right-3 top-[80px] m-0 max-h-[calc(100dvh-96px)] w-[calc(100vw-24px)] max-w-[460px] overflow-y-auto overscroll-contain rounded-[22px] border border-slate-200 bg-white p-5 text-ink backdrop:bg-transparent sm:right-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="notifications-title" className="text-[22px] font-semibold tracking-tight">Notifications</h2>
        <button type="button" aria-label="Close notifications" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-accent"><X size={22} aria-hidden /></button>
      </div>
      {items.length ? <ul className="space-y-4">{items.map(item => <li key={item.id}>
        <Link href={item.href} onClick={close} className="flex items-start gap-3 rounded-[18px] border border-slate-200 p-4 transition-colors hover:bg-slate-50 aria-expanded:border-accent aria-expanded:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white"><Bell size={18} strokeWidth={1.5} aria-hidden /></span>
          <div className="min-w-0"><h3 className="text-[15px] font-semibold leading-6 text-ink">{item.title}</h3><p className="mt-1.5 text-[14px] font-medium leading-6 text-slate-500">{item.description}</p></div>
        </Link>
      </li>)}</ul> : <div className="rounded-[18px] border border-slate-200 px-5 py-8 text-center"><Bell size={24} className="mx-auto mb-3 text-slate-400" aria-hidden /><p className="text-[15px] font-semibold">You’re all caught up</p><p className="mt-1 text-[14px] leading-6 text-slate-500">New order alerts will appear here.</p></div>}
    </dialog>
  </>;
}
