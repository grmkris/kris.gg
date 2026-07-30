import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// This static-ish segment must keep winning over the `/api/[[...path]]`
// optional catch-all that serves the stash HttpApi + MCP endpoint.
export const { GET, POST } = toNextJsHandler(auth);
