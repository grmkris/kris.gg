"use client";

/**
 * Promise-shaped wrappers over the typed Effect client. Components import from
 * here and never see an `Effect` — see `src/lib/api/runtime.ts` for why the
 * runtime is confined to one module.
 */

import { getApi, runApi } from "@/lib/api/runtime";
import type {
  GeneratedRoute,
  PlannedRoute,
  RouteInputs,
} from "@/planner/schema";

export const planRoute = async (
  inputs: RouteInputs,
  seedBase?: number
): Promise<GeneratedRoute> => {
  const api = await getApi();
  return await runApi(
    api.routes.plan({
      payload: seedBase === undefined ? { inputs } : { inputs, seedBase },
    })
  );
};

export const listRoutes = async (): Promise<readonly PlannedRoute[]> => {
  const api = await getApi();
  return await runApi(api.routes.list());
};

export const saveRoute = async (
  route: GeneratedRoute
): Promise<PlannedRoute> => {
  const api = await getApi();
  return await runApi(api.routes.save({ payload: { route } }));
};

export const shareRoute = async (
  id: string,
  shared: boolean
): Promise<PlannedRoute> => {
  const api = await getApi();
  return await runApi(
    api.routes.share({ params: { id }, payload: { shared } })
  );
};

export const removeRoute = async (id: string): Promise<void> => {
  const api = await getApi();
  await runApi(api.routes.remove({ params: { id } }));
};
