"use client";

import { Popover } from "@base-ui/react/popover";
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

// Inline quiet label; brightens while its popover is open (hover or tap).
const LABEL =
  "font-sans text-xs uppercase tracking-[0.12em] text-[#8a8a8a] transition-colors duration-200 hover:text-[#f4ede1] data-[popup-open]:text-[#f4ede1] focus-visible:text-[#f4ede1] focus-visible:outline-none cursor-pointer";

// Card scales in from the trigger (origin-aware), ~150ms ease-out.
const POPUP =
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 origin-(--transform-origin) duration-150 ease-[var(--ease-out-strong)] flex items-center gap-3 rounded-none bg-[#161616] px-3 py-2 ring-1 ring-[#262626]";

const HANDLE =
  "inline-flex items-baseline gap-1 font-sans text-sm text-[#c4bdb1] transition-colors duration-200 hover:text-[#f4ede1] focus-visible:text-[#f4ede1] focus-visible:outline-none";

const COPY =
  "font-sans text-[0.7rem] uppercase tracking-[0.1em] text-[#737373] transition-[color,transform] duration-150 ease-[var(--ease-out-strong)] hover:text-[#f4ede1] focus-visible:text-[#f4ede1] focus-visible:outline-none active:scale-[0.97]";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label={copied ? "Copied" : `Copy ${label} — ${value}`}
      className={copied ? `${COPY} text-[#c8472b]` : COPY}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            window.setTimeout(() => {
              setCopied(false);
            }, 1200);
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

function ContactPopover({ contact }: { contact: Contact }) {
  const { label, display, href, copyText, external } = contact;

  // Email before hydration: the address isn't assembled yet, so show the quiet
  // label without a popover (nothing to reveal).
  if (!display) {
    return <span className={LABEL}>{label}</span>;
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        className={LABEL}
        closeDelay={80}
        delay={120}
        openOnHover
      >
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          align="center"
          className="isolate z-50"
          side="top"
          sideOffset={8}
        >
          <Popover.Popup className={POPUP}>
            <a
              aria-label={`Open ${label}, ${display}`}
              className={HANDLE}
              href={href}
              {...(external
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
            >
              {display}
              {external && (
                <span aria-hidden className="text-[0.7rem] text-[#c8472b]">
                  ↗
                </span>
              )}
            </a>
            <CopyButton label={label} value={copyText} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {contacts.map((c) => (
          <ContactPopover contact={c} key={c.key} />
        ))}
      </div>
    </div>
  );
}
