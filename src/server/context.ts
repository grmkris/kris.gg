import  { type NextRequest } from "next/server";

import { auth } from "@/auth";

import  { type Api } from "./create-api";

export const createContext = async (req: NextRequest, api: Api) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    db: api.db,
    session,
    ...api.services,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
