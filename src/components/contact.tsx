"use client";

import { Popover } from "@base-ui/react/popover";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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

// --- Shared hover-delay group ----------------------------------------------
// Once one popover is open, hovering an adjacent label opens it instantly (no
// re-waiting the 120ms delay, no enter animation) — the way a toolbar feels. A
// short grace window keeps "instant" alive briefly after the last one closes,
// mirroring Radix Tooltip's skipDelayDuration.
interface GroupApi {
  active: boolean;
  notifyOpen: () => void;
  notifyClose: () => void;
}

const GroupContext = createContext<GroupApi>({
  active: false,
  notifyClose: () => {
    // no-op default
  },
  notifyOpen: () => {
    // no-op default
  },
});

const GRACE_MS = 300;

function useGroupProvider(): GroupApi {
  const [active, setActive] = useState(false);
  const openCount = useRef(0);
  const graceTimer = useRef<number | null>(null);

  const clearGrace = useCallback(() => {
    if (graceTimer.current !== null) {
      window.clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
  }, []);

  const notifyOpen = useCallback(() => {
    clearGrace();
    openCount.current += 1;
    setActive(true);
  }, [clearGrace]);

  const notifyClose = useCallback(() => {
    openCount.current = Math.max(0, openCount.current - 1);
    if (openCount.current === 0) {
      clearGrace();
      graceTimer.current = window.setTimeout(() => {
        setActive(false);
        graceTimer.current = null;
      }, GRACE_MS);
    }
  }, [clearGrace]);

  useEffect(() => clearGrace, [clearGrace]);

  return { active, notifyClose, notifyOpen };
}

// Inline quiet label; brightens while its popover is open (hover or tap).
const LABEL = "contact-label";

// Card scales in from the trigger (origin-aware) with an interruptible
// transition (not keyframes) so rapid label-hopping retargets smoothly. A
// dashed top edge reads as a torn ticket / passport-stamp perforation. Reduced
// motion keeps the fade but drops the scale. Duration is set per-instance
// (0ms when opening instantly within the group).
const POPUP =
  "origin-(--transform-origin) flex items-center gap-3 border-t border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2 ring-1 ring-[var(--color-rule)] transition-[opacity,transform] ease-[var(--ease-out)] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:data-[ending-style]:scale-100 motion-reduce:data-[starting-style]:scale-100";

const HANDLE =
  "inline-flex items-baseline gap-1 font-sans text-sm text-[var(--color-ink-2)] transition-colors duration-200 hover:text-[var(--color-ink)] focus-visible:text-[var(--color-ink)] ";

const COPY =
  "font-sans text-sm text-[var(--color-ink-muted)] transition-[color,transform] duration-150 ease-[var(--ease-out)] hover:text-[var(--color-ink)] focus-visible:text-[var(--color-ink)]  active:scale-[0.97]";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label={copied ? "Copied" : `Copy ${label}: ${value}`}
      className={copied ? `${COPY} text-[var(--color-signal)]` : COPY}
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
      {/* Fixed-width slot so "copy" → "Copied" doesn't reflow the card. */}
      <span
        aria-live="polite"
        className="inline-block min-w-[4.5rem] text-left"
      >
        {copied ? "Copied" : "copy"}
      </span>
    </button>
  );
}

function ContactPopover({ contact }: { contact: Contact }) {
  const { label, display, href, copyText, external } = contact;
  const group = useContext(GroupContext);
  // Whether THIS popover opened instantly (a subsequent open within the group),
  // in which case it skips the enter animation.
  const [instant, setInstant] = useState(false);

  // Email before hydration: the address isn't assembled yet, so show the quiet
  // label without a popover (nothing to reveal).
  if (!display) {
    return <span className={LABEL}>{label}</span>;
  }

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) {
          setInstant(group.active);
          group.notifyOpen();
        } else {
          group.notifyClose();
        }
      }}
    >
      <Popover.Trigger
        className={LABEL}
        closeDelay={80}
        delay={group.active ? 0 : 120}
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
          <Popover.Popup
            className={`${POPUP} ${instant ? "duration-0" : "duration-150"}`}
          >
            <a
              aria-label={`Open ${label}, ${display}`}
              className={HANDLE}
              href={href}
              {...(external
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
            >
              {display}
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
  const group = useGroupProvider();

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
    <GroupContext.Provider value={group}>
      <div className="public-contact-block">
        <p className="public-meta">Get in touch</p>

        <div className="public-contact">
          {contacts.map((c) => (
            <ContactPopover contact={c} key={c.key} />
          ))}
        </div>
      </div>
    </GroupContext.Provider>
  );
}
