/**
 * The `StashAuth` middleware *declaration* only.
 *
 * This module is imported by `api.ts`, which the browser client also imports —
 * so it must stay free of server-only dependencies. The implementation (which
 * pulls in better-auth and the D1 client) lives in `middleware-live.ts` and is
 * imported exclusively by the route handler.
 */

import { Context } from "effect";
import { HttpApiMiddleware } from "effect/unstable/httpapi";

import { Unauthorized } from "./schema";

export interface CurrentUserShape {
  readonly userId: string;
}

export class CurrentUser extends Context.Service<
  CurrentUser,
  CurrentUserShape
>()("kris-gg/CurrentUser") {}

export class StashAuth extends HttpApiMiddleware.Service<
  StashAuth,
  { readonly provides: CurrentUser }
>()("kris-gg/StashAuth", { error: Unauthorized }) {}
