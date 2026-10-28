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
    <header className="public-nav">
      <nav className="public-container public-nav-inner">
        {/* "kg" monogram — a mark, not the domain (no longer doubles the hero) */}
        <Link aria-label="kris.gg home" className="public-mark" href="/">
          kg
        </Link>

        {/* Numbered table-of-contents nav; active section = italic stamp-red */}
        <ul className="public-nav-links">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className="public-nav-link"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="public-nav-contact">
            <Link className="public-nav-action" href="/#contact">
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
