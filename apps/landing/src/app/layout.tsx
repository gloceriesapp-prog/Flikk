import type { Metadata } from "next";
import { gilroy } from "./fonts";
import "./globals.css";
import SmoothScroll from "@/components/providers/SmoothScroll";

export const metadata: Metadata = {
  title: "Flikk — 10 Minute Instant Delivery",
  description: "Get groceries, fresh produce, meat, dairy & daily essentials delivered to your doorstep in 10 minutes in Mangalore.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={gilroy.variable}>
      <body className="font-sans antialiased bg-white text-slate-900">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
