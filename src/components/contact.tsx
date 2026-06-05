"use client";

import { useEffect, useState } from "react";

// Email is assembled client-side so the address never ships in the static
// HTML — naive scrapers that read the server response come up empty.
const EMAIL_USER = "kristjan.grm1";
const EMAIL_DOMAIN = "gmail.com";

const TELEGRAM = "kristjan96";

const SOCIALS = [
  { href: "https://github.com/grmkris", label: "GitHub" },
  { href: "https://x.com/_krisgg", label: "X" },
  { href: "https://linkedin.com/in/kristjan-grm-1572a7159", label: "LinkedIn" },
];

function Arrow() {
  return (
    <span className="text-[#525252] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#c8472b]">
      →
    </span>
  );
}

export function Contact() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEmail(`${EMAIL_USER}@${EMAIL_DOMAIN}`);
  }, []);

  return (
    <div>
      <p className="credit-block text-xs text-[#737373]">Get in touch</p>

      <div className="mt-3 flex flex-col gap-2">
        {email ? (
          <a
            href={`mailto:${email}`}
            className="group inline-flex w-fit items-center gap-2 font-display text-lg text-[#f4ede1] transition-colors hover:text-[#c8472b]"
          >
            {email}
            <Arrow />
          </a>
        ) : (
          // Pre-hydration / no-JS fallback — label only, no live address.
          <span className="font-display text-lg text-[#737373]">Email</span>
        )}

        <a
          href={`https://t.me/${TELEGRAM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex w-fit items-center gap-2 font-display text-lg text-[#f4ede1] transition-colors hover:text-[#c8472b]"
        >
          Telegram @{TELEGRAM}
          <Arrow />
        </a>
      </div>

      <div className="mt-5 flex gap-5 font-sans text-xs uppercase tracking-[0.15em]">
        {SOCIALS.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#525252] transition-colors hover:text-[#f4ede1]"
          >
            {social.label}
          </a>
        ))}
      </div>
    </div>
  );
}
