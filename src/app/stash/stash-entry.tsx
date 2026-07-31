"use client";

import { useSearchParams } from "next/navigation";

import { StashView } from "./stash-view";

/**
 * Reads the entry-point query parameters on the *client* so `/stash` and
 * `/stash/share` stay statically prerendered.
 *
 * Awaiting `searchParams` in the page instead would be simpler, but it opts the
 * route into dynamic rendering — a serverless invocation on every open, for a
 * page that is a client-rendered shell either way. The stash is a capture tool;
 * the shell should come off the CDN.
 *
 * - `compose` — the manifest's "New capture" app shortcut.
 * - `title` / `text` / `url` — the PWA share target (Android, desktop Chrome).
 *   Which of the three arrives is up to the sending app: browsers usually send
 *   `title` + `url`, notes apps often only `text`.
 */
export function StashEntry() {
  const params = useSearchParams();

  const shared = [params.get("title"), params.get("text"), params.get("url")]
    .filter((part): part is string => part !== null && part.trim() !== "")
    .map((part) => part.trim());
  // Apps often repeat the link in both `text` and `url`.
  const draft = [...new Set(shared)].join("\n");

  return (
    <StashView
      autoFocus={params.has("compose") || draft !== ""}
      initialDraft={draft}
    />
  );
}
