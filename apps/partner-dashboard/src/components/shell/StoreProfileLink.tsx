'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store as StoreIcon } from 'lucide-react';
import { useStoreContext } from '@/lib/storeContext';

export function StoreProfileLink() {
  const { store } = useStoreContext();
  const pathname = usePathname();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const name = store?.name.trim() || 'My store';
  const characters = Array.from(name);
  const shortName = characters.length > 10 ? `${characters.slice(0, 10).join('')}…` : name;
  const photo = store?.photo_url;

  return <Link href="/settings" aria-label={`Store settings: ${name}`} title={name}
    aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
    className="flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-ink transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[current=page]:border-accent aria-[current=page]:text-accent sm:pr-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
      {photo && photo !== failedPhoto ? (
        // Store-uploaded remote images retain their original URL without a Next image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={28} height={28} className="h-full w-full object-cover" onError={() => setFailedPhoto(photo)} />
      ) : <StoreIcon size={17} strokeWidth={1.5} aria-hidden />}
    </span>
    <span className="max-w-[100px] truncate text-[13px] font-semibold sm:max-w-[130px] sm:text-[14px]">{shortName}</span>
  </Link>;
}
