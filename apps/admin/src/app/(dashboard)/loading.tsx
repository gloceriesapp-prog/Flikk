// Instant navigation feedback for every dashboard page. This is the route
// segment's Suspense fallback: it renders the moment a nav starts — inside
// <main>, so the Sidebar + TopNav stay put and only the content area shows
// a skeleton — instead of freezing on the previous page (or, in dev, while
// the next route compiles). One file covers every page under (dashboard);
// a page needing a bespoke skeleton can add its own loading.tsx to override.

import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title + subtitle */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stat/summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Main panel + list rows */}
      <Skeleton className="h-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
