"use client";

import { useEffect, useState } from "react";

// Email is assembled client-side so the address never ships in the static
// HTML — naive scrapers that read the server response come up empty.
const EMAIL_USER = "hello";
const EMAIL_DOMAIN = "kris.gg";

const TELEGRAM = "kristjan96";

// One equal tier — Email is prepended client-side once assembled.
const LINKS = [
  { href: `https://t.me/${TELEGRAM}`, label: "Telegram" },
  { href: "https://github.com/grmkris", label: "GitHub" },
  { href: "https://x.com/_krisgg", label: "X" },
  { href: "https://linkedin.com/in/kristjan-grm-1572a7159", label: "LinkedIn" },
];

// Shared treatment so every contact reads at the same weight; stamp-red
// underline is the single hover accent. Sized up from the rest of the metadata
// so this reads as the page's primary call to action.
const LINK_CLASS =
  "py-1 font-sans text-sm uppercase tracking-[0.12em] text-[#a3a3a3] underline-offset-4 transition-colors hover:text-[#f4ede1] hover:underline hover:decoration-[#c8472b]";

export function Contact() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEmail(`${EMAIL_USER}@${EMAIL_DOMAIN}`);
  }, []);

  return (
    <div className="border-[#1a1a1a] border-t pt-6">
      <p className="credit-block text-xs text-[#737373]">Get in touch</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {email ? (
          <a
            aria-label={`Email ${email}`}
            className={LINK_CLASS}
            href={`mailto:${email}`}
            title={email}
          >
            Email
          </a>
        ) : (
          // Pre-hydration / no-JS fallback — label only, no live address.
          <span className={LINK_CLASS}>Email</span>
        )}

        {LINKS.map((link) => (
          <a
            className={LINK_CLASS}
            href={link.href}
            key={link.label}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
