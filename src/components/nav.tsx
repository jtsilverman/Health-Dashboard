"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/sessions", label: "Sessions" },
  { href: "/log", label: "Log" },
  { href: "/fuel", label: "Fuel" },
];

function active(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-2 text-xs uppercase tracking-[0.16em]",
            active(pathname, link.href) ? "bg-white/10 text-accent" : "text-muted hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-[#10110e]/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-6xl">
        {LINKS.map((link) => (
          <li key={link.href} className="flex-1">
            <Link
              href={link.href}
              className={cn(
                "flex h-14 items-center justify-center text-[11px] uppercase tracking-[0.16em]",
                active(pathname, link.href) ? "text-accent" : "text-muted",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
