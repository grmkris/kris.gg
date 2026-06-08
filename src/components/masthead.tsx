"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/building", label: "Building" },
  { href: "/journal", label: "Journal" },
  { href: "/notes", label: "Notes" },
] as const;

export function Masthead() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-[#1a1a1a] border-b bg-[#0a0a0a]/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6 md:px-12">
        <Link
          className="font-sans text-sm uppercase tracking-[0.18em] text-[#f4ede1] transition-colors hover:text-[#c8472b]"
          href="/"
        >
          kris.gg
        </Link>

        <div className="flex gap-5 font-sans text-xs uppercase tracking-[0.15em]">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-[#c8472b]"
                    : "text-[#a3a3a3] transition-colors hover:text-[#f4ede1]"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
