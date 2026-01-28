# Agent App - Autonomous Operation

Next.js app with App Router, SQLite/Drizzle, ORPC, better-auth.

## Autonomous Workflow

After ANY code change, run this verification loop:

```
IMPLEMENT → TYPECHECK → FIX → TEST → COMMIT
```

1. Make changes
2. `bun run typecheck` - Fix all TypeScript errors
3. `bun run fix:unsafe` - Fix lint/format issues
4. `bun run test` - Verify tests pass
5. If any step fails: fix and restart from step 2
6. When all pass: commit

## Quick Reference

| Command               | Purpose                         |
| --------------------- | ------------------------------- |
| `bun run typecheck`   | TypeScript validation           |
| `bun run fix`         | Lint and format                 |
| `bun run fix:unsafe`  | Auto-fix with unsafe transforms |
| `bun run test`        | Run tests                       |
| `bun run verify`      | All checks in sequence          |
| `bun run db:generate` | Generate migration (ask first)  |
| `bun run db:push`     | Push schema (ask first)         |

## Self-Verification Checklist

Before completing work:

- [ ] `bun run verify` passes
- [ ] No `any` types (use `unknown`)
- [ ] Imports use `@/` alias
- [ ] Client components have `"use client"`
- [ ] New schemas exported from `src/db/schema/index.ts`
- [ ] Routers use `context.db` not direct imports

## Error Recovery

If same error persists after 3 fix attempts:

1. Document what was tried
2. Ask user for guidance
3. Do NOT continue blindly

## Project Structure

```
src/
├── app/                    # Pages (App Router)
│   ├── api/rpc/           # ORPC endpoint
│   └── api/auth/          # Auth endpoint
├── components/
│   └── ui/                # UI components (Button, Card, Input, etc.)
├── db/
│   ├── schema/            # Drizzle tables
│   └── migrations/        # Generated (never edit)
├── server/
│   ├── create-api.ts      # API factory with DI
│   ├── context.ts         # Request context
│   ├── index.ts           # Procedure definitions
│   └── routers/           # Route handlers
├── test/
│   ├── setup.ts           # Test infrastructure
│   └── helpers.ts         # Test utilities
├── lib/
│   └── utils.ts           # cn() helper
└── utils/
    └── orpc.ts            # ORPC client + React Query
```

## Database Operations

**NEVER auto-run**: `db:push`, `db:migrate`

Workflow:

1. Create/modify schema in `src/db/schema/`
2. Export from `src/db/schema/index.ts`
3. Ask: "Run db:generate to create migration?"
4. After approval: `bun run db:generate`
5. Ask: "Push schema with db:push?"
6. After approval: `bun run db:push`

Query directly:

```bash
sqlite3 local.db ".schema"
sqlite3 local.db "SELECT * FROM user"
```

## Code Patterns

### Schema (SQLite)

```typescript
// src/db/schema/{name}.ts
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const items = sqliteTable(
  "items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("items_userId_idx").on(table.userId)]
);

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(user, { fields: [items.userId], references: [user.id] }),
}));
```

### Router

```typescript
// src/server/routers/index.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { items } from "@/db/schema";
import { protectedProcedure, publicProcedure } from "../index";

export const appRouter = {
  // Use context.db for all database operations
  listItems: protectedProcedure.handler(async ({ context }) => {
    return context.db
      .select()
      .from(items)
      .where(eq(items.userId, context.session.user.id));
  }),

  createItem: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      return context.db
        .insert(items)
        .values({
          name: input.name,
          userId: context.session.user.id,
        })
        .returning();
    }),
};
```

### Page Component

```tsx
// src/app/{route}/page.tsx
export default function MyPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold">Title</h1>
    </div>
  );
}
```

### Client Component with Data

```tsx
"use client";

import { orpc } from "@/utils/orpc";
import { Skeleton } from "@/components/ui/skeleton";

export default function ItemList() {
  const { data, isLoading } = orpc.listItems.useQuery();

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="space-y-4">
      {data?.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Testing

```typescript
// src/server/routers/items.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { call } from "@orpc/server";
import {
  createTestSetup,
  createTestContext,
  type TestSetup,
} from "@/test/setup";
import { appRouter } from "./index";

describe("items router", () => {
  let setup: TestSetup;

  beforeAll(async () => {
    setup = await createTestSetup();
  });

  afterAll(() => setup.close());

  it("should list items", async () => {
    const ctx = createTestContext(setup);
    const result = await call(appRouter.listItems, {}, { context: ctx });
    expect(Array.isArray(result)).toBe(true);
  });
});
```

## Components

See `COMPONENTS.md` for full UI library.

Key imports:

- `@/components/ui/button` - Button with variants
- `@/components/ui/card` - Card, CardHeader, CardTitle, CardContent
- `@/components/ui/input` - Form input
- `@/components/ui/skeleton` - Loading placeholder
- `@/components/ui/dialog` - Modals, confirmations
- `@/components/ui/sheet` - Mobile bottom panels
- `@/components/ui/select` - Dropdown inputs
- `@/components/ui/textarea` - Multi-line text
- `@/components/ui/table` - Data display
- `@/components/ui/tabs` - Content organization
- `@/components/ui/calendar` - Date selection
- `@/components/ui/chart` - Data visualization
- `@/components/ui/command` - Search, quick actions
- `@/components/ui/badge` - Status indicators
- `@/components/ui/progress` - Progress bars
- `@/components/ui/switch` - Toggles
- `sonner` - toast() for notifications

## Auth

- `publicProcedure` - No auth required
- `protectedProcedure` - Requires session, access via `context.session.user`
- Client: `authClient.useSession()` for session state

## Instruction Protocol

At session start, check `.claude/INSTRUCTION.md`. If present:

1. Read instruction completely
2. Plan implementation based on requirements
3. Implement with small, verified commits
4. Run `bun run verify` after each change
5. Check off acceptance criteria as completed
6. Final commit: `feat: complete [instruction title]`
7. Rename to `INSTRUCTION.done.md`

### INSTRUCTION.md Format

```markdown
# Instruction: [Title]

## Objective

[What to build in 1-2 sentences]

## Requirements

- [Feature 1]
- [Feature 2]

## Acceptance Criteria

- [ ] [Verifiable criterion 1]
- [ ] `bun run verify` passes

## Reference Skills

- See: `.claude/skills/[relevant-skill].md`
```

## Mobile-First Default

All UI must be mobile-first:

- Touch targets min 44x44px
- Stack on mobile, grid on desktop
- Bottom actions with Sheet component
- Test at 375px width (iPhone SE)

See `.claude/skills/mobile-patterns/SKILL.md` for patterns.

## Charts

Use `@/components/ui/chart` for data visualization:

- LineChart - progress over time
- BarChart - comparisons
- AreaChart - cumulative data
- PieChart - distribution

See `.claude/skills/frontend-patterns/charts.md` for patterns.

## Commit Workflow

1. `git status`
2. `git diff`
3. Stage specific files: `git add src/specific/file.ts`
4. Commit:

   ```bash
   git commit -m "$(cat <<'EOF'
   feat: description

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

Never: `git add .`, `git add -A`, force push, amend without asking

## Conventions

- Use `@/` import alias
- `unknown` over `any`
- `const` by default
- Arrow functions for callbacks
- `async/await` over promise chains
- Semantic HTML + ARIA attributes
