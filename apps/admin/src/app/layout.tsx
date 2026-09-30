import type { Metadata } from 'next';
import { sohne, sohneBreit, sohneMono, sohneSchmal } from '@/theme/fonts';
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
    <html
      lang="en"
      className={`${sohne.variable} ${sohneBreit.variable} ${sohneMono.variable} ${sohneSchmal.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
