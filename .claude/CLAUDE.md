# Agent App

You are maintaining a Next.js application. Build features the user requests.

## Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
│   └── ui/           # Base UI components (Button, Card, Input, etc.)
├── db/
│   ├── schema/       # Drizzle table definitions
│   └── migrations/   # Generated migrations
├── server/
│   └── routers/      # ORPC API endpoints
└── lib/              # Utilities
```

## Database (Drizzle + SQLite)

Database file: `local.db`

### Commands

- `bun run db:generate` - Generate migration after schema change
- `bun run db:push` - Push schema directly (dev only)

### Query directly

```bash
sqlite3 local.db ".schema"
sqlite3 local.db "SELECT * FROM user"
```

### Creating a table

1. Create schema file in `src/db/schema/{name}.ts`:

```typescript
import { sqliteTable, text, integer, sql } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
```

2. Export from `src/db/schema/index.ts`
3. Run `bun run db:generate && bun run db:push`

## API Endpoints (ORPC)

Add endpoints to `src/server/routers/index.ts`:

```typescript
import { z } from "zod";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { eq } from "drizzle-orm";

export const appRouter = {
  // Public endpoint
  listHabits: publicProcedure.handler(async () => {
    return db.select().from(habits);
  }),

  // With input validation
  createHabit: publicProcedure
    .input(z.object({ name: z.string() }))
    .handler(async ({ input }) => {
      return db.insert(habits).values({ name: input.name }).returning();
    }),

  // Protected endpoint (requires auth)
  deleteHabit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      return db.delete(habits).where(eq(habits.id, input.id));
    }),
};
```

## Creating Pages

Create `src/app/{route}/page.tsx`:

```tsx
export default function HabitsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold">Habits</h1>
      {/* Content */}
    </div>
  );
}
```

### Client Components with Data

```tsx
"use client";

import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";

export default function HabitsPage() {
  const { data: habits, refetch } = orpc.listHabits.useQuery();
  const createMutation = orpc.createHabit.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div>
      {habits?.map((h) => <div key={h.id}>{h.name}</div>)}
      <Button onClick={() => createMutation.mutate({ name: "Exercise" })}>
        Add Habit
      </Button>
    </div>
  );
}
```

## Components

See `COMPONENTS.md` for the full UI component library with examples.

## Auth

- `protectedProcedure` - Requires authenticated user
- `publicProcedure` - No auth required
- Access user: `context.session.user` in protected procedures

## Port & URL

- Runs on port 3000
- Accessible at `https://{subdomain}.sprites.dev/`

---

# Code Standards

This project uses **Ultracite** for linting and formatting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`

## Core Principles

- Use explicit types for function parameters and return values
- Prefer `unknown` over `any`
- Use `const` by default, `let` only when reassignment is needed
- Use arrow functions for callbacks
- Use `async/await` over promise chains
- Use function components with hooks
- Use semantic HTML and ARIA attributes for accessibility
