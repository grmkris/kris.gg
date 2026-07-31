/**
 * The site's single `HttpApi` root.
 *
 * Lifted out of `src/stash/api.ts` when the planner arrived: the identifier was
 * already site-wide ("kris-gg"), and leaving the root there would have forced
 * `src/stash` to import `src/planner` just to register a second group.
 *
 * Imported by the browser as well as the server, so — like every group it
 * composes — it must never reach server-only code.
 */

import { HttpApi } from "effect/unstable/httpapi";

import { RoutesGroup, RoutesPublicGroup } from "@/planner/api";
import { StashGroup } from "@/stash/api";

export class KrisApi extends HttpApi.make("kris-gg").add(
  StashGroup,
  RoutesGroup,
  RoutesPublicGroup
) {}
