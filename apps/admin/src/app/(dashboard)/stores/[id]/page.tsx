import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PLACEHOLDER_STORES } from '@/lib/mock-data';
import { StoreDetailForm } from '@/components/stores/StoreDetailForm';

export default async function StoreDetailPage({ params }: PageProps<'/stores/[id]'>) {
  const { id } = await params;
  const store = PLACEHOLDER_STORES.find((s) => s.id === id);
  if (!store) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/stores" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} />
        Back to Stores
      </Link>

      <StoreDetailForm store={store} />
    </div>
  );
}
