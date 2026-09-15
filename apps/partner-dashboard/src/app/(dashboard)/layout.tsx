'use client';

import { Sidebar } from '@/components/Sidebar';
import { useSession } from '@/lib/useSession';

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  const { me, isLoading } = useSession();

  if (isLoading || !me) {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]" />;
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAF9]">
      <Sidebar storeName={me.name ?? 'Your store'} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
