# Capture to the stash from the iPhone share sheet

The PWA manifest declares a `share_target`, and **iOS ignores it**. Safari
supports neither the Web Share Target API nor manifest `shortcuts`, so an
installed PWA can never appear in the iOS share sheet. That is a platform
limitation, not a configuration problem, and it has not moved in years.

What _does_ put "Stash" in the iOS share sheet is a **Shortcuts.app shortcut**
with "Show in Share Sheet" enabled. It posts to the same `/api/stash` endpoint
the CLI and Raycast use, with the same API key.

Android and desktop Chrome need none of this — the manifest's `share_target`
covers them.

## Build it

Shortcuts.app → **＋** → rename to `Stash` → **ⓘ** → enable **Show in Share
Sheet**, and set _Share Sheet Types_ to **Text** and **URLs**.

Then add these actions in order:

1. **Receive** — `Text` and `URLs` from _Share Sheet_ (this is the shortcut's
   input; if nothing is provided, set it to _Ask For Text_).
2. **Text** — set the content to the Shortcut Input variable. This is the body
   of the capture.
3. **Get Contents of URL**
   - **URL**: `https://kris.gg/api/stash`
   - **Method**: `POST`
   - **Headers**:
     - `x-api-key` → your key (mint one with `bun run scripts/stash-key.ts ios`)
     - `Content-Type` → `application/json`
   - **Request Body**: `JSON`
     - `body` (Text) → the _Text_ variable from step 2
     - `source` (Text) → `ios`

`source` is validated against `StashSource` in `src/stash/schema.ts` — `web`,
`raycast`, `cli`, `mcp`, `extension`, `ios`. Anything else is a 400. Recording it
honestly is the point: the source column is what tells you which capture
surfaces you actually use.

Leave `kind` unset: the server defaults to `note`, and a shared URL will still
open fine from the list. If you want links classified properly, add a
`kind` → `link` field in an _If_ branch when the input is a URL.

## Check it

Share a page from Safari → _Stash_. The row should appear at
<https://kris.gg/stash> immediately. If it 401s, the key is wrong or was minted
against the other database — dev and production have separate D1 instances, and
therefore separate keys.

Point the URL at `https://dev.kris.gg/api/stash` to test against dev first.

## Why not just open the PWA

You can add `/stash` to the home screen and it opens standalone with its own
icon — that part works on iOS. It just cannot receive a share. The shortcut is
the capture path; the PWA is the triage UI.
