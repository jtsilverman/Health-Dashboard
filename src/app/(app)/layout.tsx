import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:pb-16">{children}</main>
      <MobileNav />
    </div>
  );
}
