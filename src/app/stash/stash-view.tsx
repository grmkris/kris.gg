"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { StashItem } from "@/stash/schema";

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

function SignIn() {
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const result = await authClient.signIn.passkey();
    setBusy(false);
    if (result?.error) {
      toast.error(result.error.message ?? "Passkey sign-in failed");
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-display text-4xl font-light text-[#f4ede1]">Stash</h1>
      <button
        className="min-h-[44px] rounded-md border border-[#333] px-5 py-2 text-sm text-[#e8e8e8] transition-colors hover:border-[#555] disabled:opacity-50"
        disabled={busy}
        onClick={() => void signIn()}
        type="button"
      >
        {busy ? "Waiting for passkey…" : "Sign in with passkey"}
      </button>
    </div>
  );
}

export function StashView() {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<readonly StashItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const signedIn = session?.user !== undefined;

  const refresh = useCallback(async () => {
    try {
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

  const save = useCallback(async () => {
    const body = draft.trim();
    if (body === "") {
      return;
    }
    setDraft("");
    const url = asUrl(body);
    try {
      const created = await createStash({
        body,
        kind: url === undefined ? "note" : "link",
        source: "web",
        ...(url === undefined ? {} : { url }),
      });
      setItems((current) => [created, ...current]);
    } catch (error) {
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

  const drop = useCallback(async (item: StashItem) => {
    setItems((current) => current.filter((i) => i.id !== item.id));
    try {
      await removeStash(item.id);
    } catch (error) {
      toast.error(`Could not delete: ${String(error)}`);
      setItems(await listStash());
    }
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
        if (item !== undefined) {
          void toggleDone(item);
        }
      } else if (event.key === "e") {
        const item = items[cursor];
        if (item !== undefined) {
          void drop(item);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [signedIn, items, cursor, toggleDone, drop]);

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
        {loading ? <p className="text-sm text-[#525252]">Loading…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="text-sm text-[#525252]">Nothing stashed yet.</p>
        ) : null}

        {items.map((item, index) => (
          <article
            className={`flex items-start gap-3 border-t border-[#1a1a1a] py-4 ${
              index === cursor ? "border-l-2 border-l-[#c8472b] pl-3" : ""
            }`}
            key={item.id}
          >
            <button
              aria-label={item.done ? "Mark not done" : "Mark done"}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center text-[#525252] transition-colors hover:text-[#e8e8e8]"
              onClick={() => void toggleDone(item)}
              type="button"
            >
              <span
                className={`block h-4 w-4 rounded-sm border ${
                  item.done ? "border-[#c8472b] bg-[#c8472b]" : "border-[#333]"
                }`}
              />
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`whitespace-pre-wrap break-words text-sm ${
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
              className="flex h-11 w-11 shrink-0 items-center justify-center text-[#525252] transition-colors hover:text-[#c8472b]"
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
