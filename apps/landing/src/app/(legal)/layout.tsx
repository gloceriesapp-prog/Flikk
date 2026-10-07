import type { ReactNode } from "react";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

// Route group for the legal pages — shares the marketing chrome without
// adding a URL segment, so pages stay at /privacy, /terms, etc. No location
// prompt here: reviewers and customers must be able to read policies at once.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar promptLocation={false} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
