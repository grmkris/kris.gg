"use client";

import { useEffect, useState } from "react";

// Email is assembled client-side so the address never ships in the static
// HTML — naive scrapers that read the server response come up empty.
const EMAIL_USER = "hello";
const EMAIL_DOMAIN = "kris.gg";

interface Contact {
  key: string;
  label: string;
  display: string;
  href: string;
  copyText: string;
  external: boolean;
}

const SOCIALS: Contact[] = [
  {
    copyText: "@kristjan96",
    display: "@kristjan96",
    external: true,
    href: "https://t.me/kristjan96",
    key: "telegram",
    label: "Telegram",
  },
  {
    copyText: "grmkris",
    display: "grmkris",
    external: true,
    href: "https://github.com/grmkris",
    key: "github",
    label: "GitHub",
  },
  {
    copyText: "@_krisgg",
    display: "@_krisgg",
    external: true,
    href: "https://x.com/_krisgg",
    key: "x",
    label: "X",
  },
  {
    copyText: "https://linkedin.com/in/kristjan-grm-1572a7159",
    display: "in/kristjan-grm",
    external: true,
    href: "https://linkedin.com/in/kristjan-grm-1572a7159",
    key: "linkedin",
    label: "LinkedIn",
  },
];

const ROW =
  "group grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 py-0.5";
const LABEL =
  "font-sans text-xs uppercase tracking-[0.12em] text-[#737373] transition-colors group-hover:text-[#a3a3a3]";
// Stamp-red underline grows left→right on row hover (gradient bg sized 0→100%).
const HANDLE =
  "inline-flex items-baseline gap-1 justify-self-start bg-gradient-to-r from-[#c8472b] to-[#c8472b] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 font-sans text-sm text-[#c4bdb1] transition-[color,background-size] duration-300 group-hover:bg-[length:100%_1px] group-hover:text-[#f4ede1]";
// Always visible on touch; hover/focus-revealed only where hover exists.
const COPY =
  "inline-flex min-h-[44px] items-center justify-self-end px-2 font-sans text-[0.7rem] [@media(hover:hover)]:min-h-0 uppercase tracking-[0.1em] text-[#737373] opacity-100 transition-[color,opacity] duration-200 hover:text-[#f4ede1] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label={copied ? "Copied" : `Copy ${label} — ${value}`}
      className={copied ? `${COPY} text-[#c8472b] opacity-100` : COPY}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          },
          () => {
            // clipboard blocked — no-op
          }
        );
      }}
      type="button"
    >
      <span aria-live="polite">{copied ? "✓ copied" : "copy"}</span>
    </button>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const { label, display, href, copyText, external } = contact;

  // Email row before hydration: label only (address not yet assembled).
  if (!display) {
    return (
      <div className={ROW}>
        <span className={LABEL}>{label}</span>
        <span className="font-sans text-sm text-[#525252]">…</span>
        <span />
      </div>
    );
  }

  return (
    <div className={ROW}>
      <span className={LABEL}>{label}</span>
      <a
        aria-label={`Open ${label}, ${display}`}
        className={HANDLE}
        href={href}
        {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
      >
        {display}
        {external && (
          <span
            aria-hidden
            className="text-[0.7rem] text-[#525252] transition-colors group-hover:text-[#c8472b]"
          >
            ↗
          </span>
        )}
      </a>
      <CopyButton label={label} value={copyText} />
    </div>
  );
}

export function Contact() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEmail(`${EMAIL_USER}@${EMAIL_DOMAIN}`);
  }, []);

  const emailContact: Contact = {
    copyText: email,
    display: email,
    external: false,
    href: email ? `mailto:${email}` : "",
    key: "email",
    label: "Email",
  };

  const contacts = [emailContact, ...SOCIALS];

  return (
    <div className="border-[#1a1a1a] border-t pt-6">
      <p className="credit-block text-xs text-[#737373]">Get in touch</p>

      <div className="mt-2 max-w-md">
        {contacts.map((c) => (
          <ContactRow contact={c} key={c.key} />
        ))}
      </div>
    </div>
  );
}
