import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { DesktopNav } from "@/components/nav";
import { RefreshButton } from "@/components/refresh-button";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[#10110e]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <Link href="/" className="font-display text-[2rem] leading-none tracking-[0.18em] text-foreground">
            CADENCE
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted">Jake Silverman · HYROX · New York</p>
        </div>
        <DesktopNav />
        <div className="flex items-start gap-2">
          <RefreshButton />
          <form action={logoutAction}>
            <button
              type="submit"
              className="h-9 rounded-full px-3 text-xs uppercase tracking-[0.14em] text-muted hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
