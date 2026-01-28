import  { type db as database } from "@/db";

type Database = typeof database;

interface ApiDeps {
  db: Database;
}

// Services will be added here as the app grows
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Services = Record<string, never>;

export const createApi = (deps: ApiDeps) => {
  const { db } = deps;

  // Create services with dependency injection
  // const itemService = createItemService({ db });

  const services: Services = {};

  return { db, services };
};

export type Api = ReturnType<typeof createApi>;
