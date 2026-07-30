"use client";

/**
 * Promise-shaped wrappers over the typed Effect client. Components import from
 * here and never see an `Effect` — see `src/lib/api/runtime.ts` for why the
 * runtime is confined to one module.
 */

import { getApi, runApi } from "@/lib/api/runtime";
import type {
  CreateStashItem,
  StashItem,
  UpdateStashItem,
} from "@/stash/schema";

export const listStash = async (): Promise<readonly StashItem[]> => {
  const api = await getApi();
  return await runApi(api.stash.list());
};

export const createStash = async (
  payload: CreateStashItem
): Promise<StashItem> => {
  const api = await getApi();
  return await runApi(api.stash.create({ payload }));
};

export const updateStash = async (
  id: string,
  payload: UpdateStashItem
): Promise<StashItem> => {
  const api = await getApi();
  return await runApi(api.stash.update({ params: { id }, payload }));
};

export const removeStash = async (id: string): Promise<void> => {
  const api = await getApi();
  await runApi(api.stash.remove({ params: { id } }));
};
