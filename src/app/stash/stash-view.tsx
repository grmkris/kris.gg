"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { StashItem } from "@/stash/schema";
import type { StashItemId } from "@/stash/schema";

import {
  createStash,
  listStash,
  removeStash,
  updateStash,
} from "./stash-client";

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable);

const without = (set: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

/**
 * `StashItem` is an Effect `Schema.Class`, so `{ ...item, done }` would hand
 * back a plain object typed as a `StashItem` — prototype gone, and a lie to
 * every consumer. Rebuild through the constructor instead.
 */
const withDone = (item: StashItem, done: boolean): StashItem =>
  // oxlint-disable-next-line typescript/no-misused-spread -- immediately rebuilt into the class
  new StashItem({ ...item, done });

/** Detects a URL-only capture so it can be stored as a link rather than a note. */
const asUrl = (text: string): string | undefined => {
  const trimmed = text.trim();
  if (!/^https?:\/\/\S+$/.test(trimmed)) {
    return;
  }
  return trimmed;
};

/**
 * Placeholder rows while the first list loads. The geometry matches a real row
 * — 44px control, two text lines, same padding and divider — so the list does
 * not jump when the data arrives.
 */
function StashSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      {[0, 1, 2].map((row) => (
        <div
          className="flex items-start gap-3 border-t border-[#1a1a1a] py-4"
          key={row}
        >
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center">
            <span className="block h-4 w-4 rounded-[3px] bg-[#1a1a1a]" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <span
              className="block h-3 rounded-sm bg-[#1a1a1a]"
              style={{ width: ["78%", "56%", "67%"][row] }}
            />
            <span className="block h-2.5 w-24 rounded-sm bg-[#141414]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SignIn() {
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [secret, setSecret] = useState("");

  const signIn = async () => {
    setBusy(true);
    const result = await authClient.signIn.passkey();
    setBusy(false);
    if (result?.error) {
      toast.error(result.error.message ?? "Passkey sign-in failed");
    }
  };

  /**
   * Enrol this device. The secret is `STASH_REGISTRATION_SECRET`, checked
   * server-side in `src/lib/auth.ts` — this field is a courier, not the gate.
   * Registration does not create a session, so sign in straight after.
   */
  const register = async () => {
    if (secret.trim() === "") {
      return;
    }
    setBusy(true);
    const result = await authClient.passkey.addPasskey({
      context: secret.trim(),
      name: `${navigator.platform || "device"} · ${new Date().toISOString().slice(0, 10)}`,
    });
    if (result?.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Registration failed");
      return;
    }
    setSecret("");
    setRegistering(false);
    await signIn();
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-display text-4xl font-light text-[#f4ede1]">Stash</h1>
      <button
        className="min-h-[44px] rounded-md border border-[#333] px-5 py-2 text-sm text-[#e8e8e8] transition-[color,border-color,transform] duration-150 ease-out hover:border-[#555] active:scale-[0.96] disabled:opacity-50"
        disabled={busy}
        onClick={() => void signIn()}
        type="button"
      >
        {busy ? "Waiting for passkey…" : "Sign in with passkey"}
      </button>

      {registering ? (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input
            autoComplete="off"
            className="min-h-[44px] rounded-md border border-[#1a1a1a] bg-[#111] px-3 text-sm text-[#e8e8e8] outline-none transition-colors placeholder:text-[#525252] focus:border-[#333]"
            onChange={(event) => {
              setSecret(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void register();
              }
            }}
            placeholder="Registration secret"
            type="password"
            value={secret}
          />
          <button
            className="min-h-[44px] rounded-md border border-[#333] px-5 py-2 text-sm text-[#e8e8e8] transition-[color,border-color,transform] duration-150 ease-out hover:border-[#555] active:scale-[0.96] disabled:opacity-50"
            disabled={busy || secret.trim() === ""}
            onClick={() => void register()}
            type="button"
          >
            {busy ? "Waiting for passkey…" : "Register this device"}
          </button>
        </div>
      ) : (
        <button
          className="min-h-[44px] text-xs text-[#525252] underline underline-offset-4 transition-colors hover:text-[#a3a3a3]"
          onClick={() => {
            setRegistering(true);
          }}
          type="button"
        >
          Register a new device
        </button>
      )}
    </div>
  );
}

interface StashViewProps {
  /** Prefills the composer — used by the PWA share target (/stash/share). */
  readonly initialDraft?: string;
  /** Focus the composer on arrival, for the share target and the app shortcut. */
  readonly autoFocus?: boolean;
}

export function StashView({ autoFocus, initialDraft }: StashViewProps = {}) {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<readonly StashItem[]>([]);
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  /** Rows written optimistically, not yet acknowledged by the server. */
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  /** Rows added after mount — the only ones that animate in. */
  const [entering, setEntering] = useState<ReadonlySet<string>>(new Set());
  /** Rows playing their exit animation before being dropped from the list. */
  const [exiting, setExiting] = useState<ReadonlySet<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * A provisional row is created with a temporary id and later replaced by the
   * server's. React would treat that as a different element and remount it
   * mid-animation, so rows are keyed through this map: the real id inherits the
   * provisional id's key and the DOM node survives the swap.
   */
  const rowKeys = useRef(new Map<string, string>());
  const keyFor = (id: string): string => {
    const existing = rowKeys.current.get(id);
    if (existing !== undefined) {
      return existing;
    }
    rowKeys.current.set(id, id);
    return id;
  };

  const signedIn = session?.user !== undefined;

  const refresh = useCallback(async () => {
    try {
      // Deliberately does not clear `items` first: a refetch keeps the current
      // list on screen rather than flashing empty for a Cloudflare round trip.
      setItems(await listStash());
    } catch (error) {
      toast.error(`Could not load stash: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) {
      void refresh();
    }
  }, [signedIn, refresh]);

  useEffect(() => {
    if (signedIn && autoFocus === true) {
      inputRef.current?.focus();
      // Caret to the end: a shared link is prefilled, and the natural next
      // action is to type a note after it.
      const length = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(length, length);
    }
  }, [signedIn, autoFocus]);

  const save = useCallback(async () => {
    const body = draft.trim();
    if (body === "") {
      return;
    }
    const url = asUrl(body);
    const kind = url === undefined ? ("note" as const) : ("link" as const);
    const now = Date.now();
    const tempId = `stx_local_${crypto.randomUUID().replaceAll("-", "")}`;

    // Show the row immediately. Every write is one Vercel -> Cloudflare round
    // trip, so waiting for the response before rendering is the whole reason
    // saving felt slow.
    const provisional = new StashItem({
      archivedAt: null,
      body,
      createdAt: now,
      done: false,
      id: tempId as StashItemId,
      kind,
      source: "web",
      tags: [],
      title: null,
      updatedAt: now,
      url: url ?? null,
    });

    setDraft("");
    setItems((current) => [provisional, ...current]);
    setPending((current) => new Set(current).add(tempId));
    setEntering((current) => new Set(current).add(tempId));

    try {
      const created = await createStash({
        body,
        kind,
        source: "web",
        ...(url === undefined ? {} : { url }),
      });
      // Inherit the provisional row's key so the swap does not remount it.
      rowKeys.current.set(created.id, keyFor(tempId));
      setItems((current) =>
        current.map((i) => (i.id === tempId ? created : i))
      );
      setEntering((current) =>
        new Set(without(current, tempId)).add(created.id)
      );
      setPending((current) => without(current, tempId));
    } catch (error) {
      setItems((current) => current.filter((i) => i.id !== tempId));
      setPending((current) => without(current, tempId));
      setEntering((current) => without(current, tempId));
      setDraft(body);
      toast.error(`Could not save: ${String(error)}`);
    }
  }, [draft]);

  const toggleDone = useCallback(async (item: StashItem) => {
    // Optimistic: the list is the whole UI, so a round-trip of latency here is
    // very visible (every write is a Vercel -> Cloudflare hop).
    setItems((current) =>
      current.map((i) => (i.id === item.id ? withDone(i, !i.done) : i))
    );
    try {
      await updateStash(item.id, { done: !item.done });
    } catch (error) {
      setItems((current) =>
        current.map((i) => (i.id === item.id ? withDone(i, item.done) : i))
      );
      toast.error(`Could not update: ${String(error)}`);
    }
  }, []);

  /**
   * Marks the row for exit; `onAnimationEnd` below is what actually drops it.
   * Letting the animation report its own completion avoids duplicating the CSS
   * duration here, where the two would drift apart.
   */
  const drop = useCallback(
    async (item: StashItem) => {
      setExiting((current) => new Set(current).add(item.id));
      try {
        await removeStash(item.id);
      } catch (error) {
        setExiting((current) => without(current, item.id));
        toast.error(`Could not delete: ${String(error)}`);
        await refresh();
      }
    },
    [refresh]
  );

  /** The exit animation finished — now the row can leave the list. */
  const settleExit = useCallback((id: string) => {
    setExiting((current) => {
      if (!current.has(id)) {
        return current;
      }
      setItems((rows) => rows.filter((row) => row.id !== id));
      return without(current, id);
    });
  }, []);

  // The repo's first keyboard layer. `/` focuses capture, j/k move, x toggles,
  // e deletes — all suppressed while typing.
  useEffect(() => {
    if (!signedIn) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "j") {
        setCursor((c) => Math.min(c + 1, items.length - 1));
      } else if (event.key === "k") {
        setCursor((c) => Math.max(c - 1, 0));
      } else if (event.key === "x") {
        const item = items[cursor];
        if (item !== undefined && !pending.has(item.id)) {
          void toggleDone(item);
        }
      } else if (event.key === "e") {
        const item = items[cursor];
        if (item !== undefined && !pending.has(item.id)) {
          void drop(item);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [signedIn, items, cursor, pending, toggleDone, drop]);

  if (isPending) {
    return <p className="text-sm text-[#525252]">Loading…</p>;
  }

  if (!signedIn) {
    return <SignIn />;
  }

  return (
    <>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-light tracking-tight text-[#f4ede1] md:text-5xl">
          Stash
        </h1>
        <span className="shrink-0 font-sans text-xs tabular-nums text-[#525252]">
          {items.length}
        </span>
      </header>

      <textarea
        className="min-h-[88px] w-full resize-y rounded-md border border-[#1a1a1a] bg-[#111] p-3 text-sm text-[#e8e8e8] outline-none transition-colors placeholder:text-[#525252] focus:border-[#333]"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void save();
          }
        }}
        placeholder="Capture something…  ( / to focus, ⌘↵ to save )"
        ref={inputRef}
        value={draft}
      />

      <section className="mt-8">
        {loading && items.length === 0 ? <StashSkeleton /> : null}
        {!loading && items.length === 0 ? (
          <p className="text-sm text-[#525252]">Nothing stashed yet.</p>
        ) : null}

        {items.map((item, index) => (
          <article
            className={`flex items-start gap-3 border-t border-[#1a1a1a] py-4 ${
              index === cursor ? "border-l-2 border-l-[#c8472b] pl-3" : ""
            } ${entering.has(item.id) ? "stash-enter" : ""} ${
              exiting.has(item.id) ? "stash-exit" : ""
            } ${
              // Not yet acknowledged by D1: dimmed, and not interactive —
              // toggling a row the server has never seen would 404.
              pending.has(item.id) ? "pointer-events-none opacity-50" : ""
            }`}
            key={keyFor(item.id)}
            onAnimationEnd={() => {
              settleExit(item.id);
            }}
          >
            <button
              aria-label={item.done ? "Mark not done" : "Mark done"}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center text-[#525252] transition-transform duration-150 ease-out hover:text-[#e8e8e8] active:scale-[0.96]"
              onClick={() => void toggleDone(item)}
              type="button"
            >
              <span
                className={`relative block h-4 w-4 rounded-[3px] border transition-colors duration-150 ease-out ${
                  item.done ? "border-[#c8472b] bg-[#c8472b]" : "border-[#333]"
                }`}
              >
                {/* Kept in the DOM and cross-faded rather than mounted on
                    toggle, so the check has an exit as well as an enter. */}
                <svg
                  aria-hidden="true"
                  className={`absolute inset-0 h-full w-full text-[#0a0a0a] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
                    item.done
                      ? "scale-100 opacity-100 blur-0"
                      : "scale-[0.25] opacity-0 blur-[4px]"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`whitespace-pre-wrap break-words text-pretty text-sm transition-colors duration-150 ease-out ${
                  item.done ? "text-[#525252] line-through" : "text-[#e8e8e8]"
                }`}
              >
                {item.body}
              </p>
              <div className="mt-1 flex items-center gap-3 font-sans text-xs text-[#525252]">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                {item.source === "web" ? null : <span>{item.source}</span>}
                {item.url === null ? null : (
                  <a
                    className="truncate underline underline-offset-2 hover:text-[#a3a3a3]"
                    href={item.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    open
                  </a>
                )}
              </div>
            </div>

            <button
              aria-label="Delete"
              className="flex h-11 w-11 shrink-0 items-center justify-center text-[#525252] transition-[color,transform] duration-150 ease-out hover:text-[#c8472b] active:scale-[0.96]"
              onClick={() => void drop(item)}
              type="button"
            >
              ×
            </button>
          </article>
        ))}
      </section>

      {/* Mounted here, not in the root layout: only /stash raises toasts, so the
          public pages keep shipping no extra JS. Rendered from a client
          component because ui/sonner.tsx has no "use client" of its own. */}
      <Toaster />
    </>
  );
}
