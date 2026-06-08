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
        {/* "kg" monogram — a mark, not the domain (no longer doubles the hero) */}
        <Link
          className="font-display text-xl lowercase text-[#f4ede1] transition-colors hover:text-[#c8472b]"
          href="/"
        >
          kg
        </Link>

        {/* Numbered table-of-contents nav; active section = italic stamp-red */}
        <ul className="flex items-center gap-5 font-sans text-xs uppercase tracking-[0.15em] sm:gap-6">
          {NAV.map((item, i) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className="group inline-flex items-baseline gap-1.5"
                  href={item.href}
                >
                  <span
                    className={`hidden text-[10px] tabular-nums sm:inline ${
                      active ? "text-[#c8472b]" : "text-[#525252]"
                    }`}
                  >
                    {`0${i + 1}`}
                  </span>
                  <span
                    className={
                      active
                        ? "text-[#c8472b] italic"
                        : "text-[#a3a3a3] transition-colors group-hover:text-[#f4ede1]"
                    }
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
