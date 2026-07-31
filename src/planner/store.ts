/**
 * `PlannerStore` — the only place that talks to D1 about routes.
 *
 * Every method is deliberately ONE statement: D1 has no usable transactions over
 * its HTTP API (see `src/db/client.ts`), so any multi-write invariant would be
 * unenforceable. Ownership is enforced by putting `userId` in the WHERE clause,
 * never by read-then-write.
 */

import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { db as defaultDb, type Db } from "@/db/client";
import { type PlannedRouteRow, plannedRoute } from "@/db/schema/planned-route";
import {
  type GeneratedRoute,
  PlannedRoute,
  type PlannedRouteId,
  PlannerStoreError,
  RouteNotFound,
} from "./schema";

const decodeRoute = Schema.decodeUnknownSync(PlannedRoute);

/** D1 row → domain object. Dates cross the wire as epoch millis. */
const toDomain = (row: PlannedRouteRow): PlannedRoute =>
  decodeRoute({
    activity: row.activity,
    bbox: row.bbox,
    constraints: row.constraints,
    coords: row.coords,
    createdAt: row.createdAt.getTime(),
    id: row.id,
    inputs: row.inputs,
    pois: row.pois,
    shareId: row.shareId,
    stats: {
      ascentM: row.ascentM,
      descentM: row.descentM,
      distanceM: row.distanceM,
      durationS: row.durationS,
      // Not persisted: a saved route is already known to be a loop, and the gap
      // is only meaningful as a generation-time sanity check.
      loopGapM: 0,
    },
    title: row.title,
    why: row.why,
  });

const wrap = <A>(thunk: () => Promise<A>): Effect.Effect<A, PlannerStoreError> =>
  Effect.tryPromise({
    catch: (cause) => new PlannerStoreError({ message: String(cause) }),
    try: thunk,
  });

/** Unguessable — it is the only credential a share link carries. */
const newShareId = (): string =>
  `shr_${crypto.randomUUID().replaceAll("-", "")}`;

export interface PlannerStoreShape {
  readonly list: (
    userId: string
  ) => Effect.Effect<readonly PlannedRoute[], PlannerStoreError>;
  readonly save: (
    userId: string,
    route: GeneratedRoute
  ) => Effect.Effect<PlannedRoute, PlannerStoreError>;
  readonly setShared: (
    userId: string,
    id: PlannedRouteId,
    shared: boolean
  ) => Effect.Effect<PlannedRoute, PlannerStoreError | RouteNotFound>;
  readonly bySharedId: (
    shareId: string
  ) => Effect.Effect<PlannedRoute, PlannerStoreError | RouteNotFound>;
  readonly remove: (
    userId: string,
    id: PlannedRouteId
  ) => Effect.Effect<void, PlannerStoreError | RouteNotFound>;
}

export class PlannerStore extends Context.Service<
  PlannerStore,
  PlannerStoreShape
>()("kris-gg/PlannerStore") {}

export const makePlannerStore = (db: Db): PlannerStoreShape => ({
  list: Effect.fn("PlannerStore.list")((userId: string) =>
    wrap(() =>
      db
        .select()
        .from(plannedRoute)
        .where(eq(plannedRoute.userId, userId))
        .orderBy(desc(plannedRoute.createdAt))
    ).pipe(Effect.map((rows) => rows.map(toDomain)))
  ),

  save: Effect.fn("PlannerStore.save")(
    (userId: string, route: GeneratedRoute) =>
      wrap(() =>
        db
          .insert(plannedRoute)
          .values({
            activity: route.inputs.activity,
            ascentM: Math.round(route.chosen.stats.ascentM),
            bbox: [...route.chosen.bbox] as [number, number, number, number],
            constraints: route.constraints as unknown as Record<
              string,
              unknown
            >,
            coords: route.chosen.coords.map((coord) => [...coord]) as [
              number,
              number,
              number,
            ][],
            descentM: Math.round(route.chosen.stats.descentM),
            distanceM: Math.round(route.chosen.stats.distanceM),
            durationS: Math.round(route.chosen.stats.durationS),
            inputs: route.inputs as unknown as Record<string, unknown>,
            pois: route.pois.map(
              (poi) => ({ ...poi }) as unknown as Record<string, unknown>
            ),
            title: route.title,
            userId,
            why: [...route.why],
          })
          .returning()
      ).pipe(
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(
                new PlannerStoreError({ message: "insert returned no row" })
              )
            : Effect.succeed(toDomain(rows[0]))
        )
      )
  ),

  setShared: Effect.fn("PlannerStore.setShared")(
    (userId: string, id: PlannedRouteId, shared: boolean) =>
      wrap(() =>
        db
          .update(plannedRoute)
          // Turning sharing back on mints a *new* id, so a previously
          // distributed link stays dead.
          .set({ shareId: shared ? newShareId() : null })
          .where(
            and(eq(plannedRoute.id, id), eq(plannedRoute.userId, userId))
          )
          .returning()
      ).pipe(
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(new RouteNotFound({ id }))
            : Effect.succeed(toDomain(rows[0]))
        )
      )
  ),

  bySharedId: Effect.fn("PlannerStore.bySharedId")((shareId: string) =>
    wrap(() =>
      db
        .select()
        .from(plannedRoute)
        .where(eq(plannedRoute.shareId, shareId))
        .limit(1)
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0] === undefined
          ? Effect.fail(new RouteNotFound({ id: shareId }))
          : Effect.succeed(toDomain(rows[0]))
      )
    )
  ),

  remove: Effect.fn("PlannerStore.remove")(
    (userId: string, id: PlannedRouteId) =>
      wrap(() =>
        db
          .delete(plannedRoute)
          .where(
            and(eq(plannedRoute.id, id), eq(plannedRoute.userId, userId))
          )
          .returning()
      ).pipe(
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(new RouteNotFound({ id }))
            : Effect.void
        )
      )
  ),
});

export const PlannerStoreLayer = Layer.succeed(PlannerStore)(
  makePlannerStore(defaultDb)
);
