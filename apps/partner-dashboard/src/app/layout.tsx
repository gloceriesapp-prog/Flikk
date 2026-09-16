import type { Metadata } from "next";
import { sohne } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flikk Partner Dashboard",
  description: "Manage your store's orders, inventory, and payouts on Flikk.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sohne.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
