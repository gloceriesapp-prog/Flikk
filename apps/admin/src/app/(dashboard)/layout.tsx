import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { requireAdminPage } from '@/lib/auth/requireAdminPage';

// Route group (dashboard) — adds no URL segment, wraps every real screen
// in the shared sidebar + topnav shell.
//
// Checks the admin itself (not only middleware.ts) on a full page load.
// Layouts don't re-render on client navigation, so Server Component pages
// that read data call requireAdminPage() too, and every /api route calls
// requireAdmin().
export default async function DashboardLayout({ children }: LayoutProps<'/'>) {
  await requireAdminPage();
  return (
    // Fixed-height shell, not min-h-screen — the whole app never scrolls as
    // one document. Sidebar and TopNav are permanently in place; only
    // <main> below scrolls internally. That's the actual fix, not a sticky
    // trick: sticky still scrolls its whole ancestor chain with the page,
    // which is exactly what was cutting the panel's rounded corner off
    // screen once content got tall enough to scroll.
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        {/* Rounded top-left only where it meets the sidebar/topnav corner,
            square everywhere else — this is the one scrollable region. */}
        <main className="flex-1 overflow-y-auto rounded-tl-3xl bg-card">
          <div className="mx-auto max-w-[1400px] px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
