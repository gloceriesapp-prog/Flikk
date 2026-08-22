import type { Metadata } from 'next';
import { sohne, sohneBreit, sohneMono, sohneSchmal } from '@/theme/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flikk Admin',
  description: 'Founder-only ops dashboard for Flikk — approvals, orders, dispatch, payouts.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sohne.variable} ${sohneBreit.variable} ${sohneMono.variable} ${sohneSchmal.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
