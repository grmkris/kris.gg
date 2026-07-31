import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

/**
 * A saved route. Single-table by design, like `stash_item`: D1 has no usable
 * transactions over its HTTP API, so every mutation must be one statement.
 *
 * Geometry is stored as a JSON array of `[lon, lat, ele]` rather than an encoded
 * polyline. ORS's `/geojson` output already gives coordinates directly, and
 * standard polyline decoders cannot handle the elevation triple — encoding it
 * would mean writing a custom codec on both sides to save bytes we are not short
 * of. The generator caps geometry at 1000 points (`MAX_STORED_POINTS`), which
 * keeps rows around 30 KB against D1's 1 MB row limit.
 */
export const plannedRoute = sqliteTable(
  "planned_route",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `rte_${crypto.randomUUID().replaceAll("-", "")}`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    activity: text("activity", {
      enum: ["run", "walk", "hike", "bike"],
    }).notNull(),
    /** The original form submission, so a route can be re-generated later. */
    inputs: text("inputs", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    /** Resolved routing constraints — what actually produced this geometry. */
    constraints: text("constraints", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    /** `[lon, lat, ele][]` — GeoJSON order. */
    coords: text("coords", { mode: "json" })
      .$type<[number, number, number][]>()
      .notNull(),
    /** `[west, south, east, north]`. */
    bbox: text("bbox", { mode: "json" })
      .$type<[number, number, number, number]>()
      .notNull(),
    distanceM: integer("distance_m").notNull(),
    ascentM: integer("ascent_m").notNull(),
    descentM: integer("descent_m").notNull(),
    durationS: integer("duration_s").notNull(),
    pois: text("pois", { mode: "json" })
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default(sql`'[]'`),
    /** Grounded explanation bullets. Empty when the model was unavailable. */
    why: text("why", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    /**
     * Null until sharing is explicitly turned on — nothing is public by default.
     * Unguessable, because it is the only credential a share link carries.
     */
    shareId: text("share_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // "my routes, newest first" — one index serves the list view.
    index("planned_route_user_created_idx").on(table.userId, table.createdAt),
    // Share lookups go straight here, and uniqueness is what makes the id a
    // usable credential.
    uniqueIndex("planned_route_share_idx").on(table.shareId),
  ]
);

export type PlannedRouteRow = typeof plannedRoute.$inferSelect;
export type PlannedRouteInsert = typeof plannedRoute.$inferInsert;
