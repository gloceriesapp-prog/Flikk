import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gloceries Admin',
  description: 'Founder-only ops dashboard for Gloceries — approvals, orders, dispatch, payouts.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: browser extensions (Bitdefender/Grammarly/
    // etc.) inject attributes like `bis_skin_checked` into <html>/<body>
    // before React hydrates, which otherwise throws a hydration-mismatch
    // error that can leave client-side navigation un-attached (links stop
    // working). Suppressing it on these two roots is the documented Next.js
    // fix and only affects extension-injected noise, not real mismatches in
    // the app's own markup.
    <html lang="en" suppressHydrationWarning>
      {/* Inter Tight from Google Fonts. A <link> here, not an @import inside
          globals.css: an @import holds the app stylesheet (and so React
          hydration) until Google answers, which left every button dead on a
          slow or blocked network. */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
