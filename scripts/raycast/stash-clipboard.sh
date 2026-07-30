#!/bin/bash
# Raycast script command — the closest a web-backed tool gets to Copper's
# double-Shift. Bind a hotkey to this in Raycast; it captures whatever is on the
# clipboard. (A browser page cannot read the OS text selection or register a
# global hotkey — that needs a native app with an Accessibility grant, which is
# why capture lives here rather than on kris.gg.)
#
# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Stash clipboard
# @raycast.mode compact
#
# Optional parameters:
# @raycast.icon 📋
# @raycast.packageName kris.gg
#
# Documentation:
# @raycast.description Save the current clipboard contents to the kris.gg stash
# @raycast.author Kristjan Grm

set -euo pipefail

: "${STASH_API_KEY:?Set STASH_API_KEY in Raycast's script command environment}"
BASE="${STASH_URL:-https://kris.gg}"

BODY="$(pbpaste)"
if [ -z "${BODY//[[:space:]]/}" ]; then
  echo "Clipboard is empty"
  exit 1
fi

if printf '%s' "$BODY" | grep -qE '^https?://[^[:space:]]+$'; then
  KIND="link"
else
  KIND="note"
fi

PAYLOAD="$(BODY="$BODY" KIND="$KIND" python3 -c '
import json, os
body = os.environ["BODY"].strip()
item = {"body": body, "kind": os.environ["KIND"], "source": "raycast"}
if item["kind"] == "link":
    item["url"] = body
print(json.dumps(item))
')"

curl -fsS -X POST "$BASE/api/stash" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $STASH_API_KEY" \
  -d "$PAYLOAD" > /dev/null

echo "Stashed"
