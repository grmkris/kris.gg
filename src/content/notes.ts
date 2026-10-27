export interface Note {
  slug: string;
  title: string;
  date: string; // "2026-05"
  summary: string;
  tags: string[];
  sourceProject?: string; // which product this pattern is drawn from
  // Markdown-ish body: paragraphs split on blank lines, inline [text](url)
  // links, and fenced ```lang code blocks highlighted with Shiki at build.
  body: string;
}

export const NOTES: Note[] = [
  {
    body: `An assistant doing useful work will eventually need to pay for something: a search, an API response, a service, or a person. Asking the owner about every ten-cent call interrupts the work. Giving the assistant the whole wallet leaves too much authority with the software. At HackMeridian I built [Nod](https://trynod.si) around a smaller permission: one allowance per AI app.

The allowance is a total until an expiry, not a per-payment limit. Give Claude 5 USDC until tomorrow. It buys a 0.10 USDC report, then sends Alice 2 USDC. It has 2.90 left. A new chat, a reconnect, or more money in the wallet does not reset that number.

Now ask it to pay Bob 5 USDC. Nod returns an approval link instead of signing with the app's key. The owner sees the recipient, amount, network, and requesting app on Nod's page, then signs that specific payment with a passkey. The wallet balance falls, but the app still has its 2.90 allowance: an owner-approved payment is a separate authorization.

There are three permissions to keep distinct. OAuth lets the app talk to the wallet. The allowance lets its key spend a bounded amount. A passkey approval authorizes one particular payment. Connecting a tool must not silently grant spending authority, and an agent saying that a payment is approved must never count as approval.

The allowance is an OpenZeppelin spending-limit policy on the owner's Stellar account. That makes the account a final enforcement point, even when the service constructs the transaction. The service also reserves spending before submission so concurrent requests do not both assume the same remaining balance. Limits in the prompt would do neither job.

Retries need their own discipline. The same payment intent and idempotency key must return the same receipt, not send the money again. An unknown submission outcome needs reconciliation before retrying. Revocation stops the service signing immediately; a passkey removes the allowance rule from the account, and unspent funds in the app's payment pocket are returned.

The payment pocket is a practical compatibility detail. The hosted x402 facilitators used by the demo accept classic Stellar accounts, so each AI app has a small pocket funded from the wallet under that same allowance. The receipt records both the funding and the seller payment. Funding the pocket still consumes the allowance; it does not create a second budget.

MCP puts the wallet beside the conversation: balance cards, receipts, and pending approvals appear where the work is happening. The passkey signature stays on Nod's own page. The useful interface is one visible amount, an expiry, and a clear approval when the app needs more authority.

The [recorded mainnet run](https://github.com/grmkris/hack-meridian-2026/blob/main/evidence/mainnet/claude-run-2026-10-25.md) covers purchases, allowance payments, passkey approval, and revoke. The [public implementation](https://github.com/grmkris/hack-meridian-2026) also records the limits of the demo. A working receipt demonstrates that flow; it is not a security audit.`,
    date: "2026-10",
    slug: "ai-allowances",
    sourceProject: "nod",
    summary:
      "A practical model for AI-agent payments: one allowance per app, on-account enforcement, and a passkey approval lane for everything above it.",
    tags: ["AI agents", "MCP", "Stellar", "WebAuthn", "Payments"],
    title: "Give your AI an allowance",
  },
  {
    body: `Bare UUIDs are a liability. \`a1b2…\` tells you nothing, IDs from different tables are interchangeable to the compiler, and a misrouted foreign key fails at runtime instead of at the type level. Stripe solved this years ago with type-prefixed IDs — \`cus_\`, \`ch_\`, \`sub_\`. Here is how I do the same in TypeScript, type-safe from the API boundary all the way into Postgres.

The foundation is a single map from entity name to prefix. Everything else is derived from it, so the prefixes can never drift out of sync with the types.

\`\`\`ts
export const idTypesMapNameToPrefix = {
  user: "usr",
  organization: "org",
  member: "mem",
  waybill: "wbl",
  driver: "drv",
  // …one entry per entity
} as const;

export type TypeId<T extends IdTypePrefixNames> =
  \`\${(typeof idTypesMapNameToPrefix)[T]}_\${string}\`;
\`\`\`

A small factory turns each entry into a Zod validator. The validator checks the prefix, the exact length, and that the suffix decodes as a real TypeID — and it is typed as \`z.ZodType<TypeId<T>>\`, so a validated value carries its entity type forward.

\`\`\`ts
export const typeIdValidator = <const T extends IdTypePrefixNames>(prefix: T) =>
  z
    .string()
    .startsWith(\`\${idTypesMapNameToPrefix[prefix]}_\`)
    .length(typeIdLength + idTypesMapNameToPrefix[prefix].length + 1)
    .refine((input) => {
      try {
        TypeID.fromString(input).asType(idTypesMapNameToPrefix[prefix]);
        return true;
      } catch {
        return false;
      }
    }) as z.ZodType<TypeId<T>, TypeId<T>>;

export const UserId = typeIdValidator("user");
export type UserId = z.infer<typeof UserId>;
\`\`\`

The last mile is the database. Postgres stores a normal \`uuid\` for index efficiency, but the application never sees a bare UUID — a Drizzle \`customType\` converts in both directions at the driver boundary, so reads come back as \`usr_…\` and writes go down as UUIDs automatically.

\`\`\`ts
export const typeId = <const T extends IdTypePrefixNames>(
  prefix: T,
  columnName: string
) =>
  customType<{ data: TypeId<T>; driverData: string }>({
    dataType() {
      return "uuid";
    },
    fromDriver(input: string): TypeId<T> {
      return typeIdFromUuid(prefix, input);
    },
    toDriver(input: TypeId<T>): string {
      return typeIdToUuid(input).uuid;
    },
  })(columnName);
\`\`\`

The payoff: an \`OrderId\` can never be passed where a \`CustomerId\` is expected, IDs are self-describing in logs and URLs, and the storage layer stays on native UUIDs. The whole thing is ~100 lines of shared code reused across every service.`,
    date: "2026-05",
    slug: "typeids",
    sourceProject: "zednabi",
    summary:
      "Stripe-style IDs (usr_…, org_…) with a Zod validator factory, a compile-time prefix→name map, and a Drizzle custom column for transparent UUID↔TypeID conversion.",
    tags: ["TypeScript", "Drizzle", "Zod", "Postgres"],
    title: "Type-prefixed IDs that are type-safe end to end",
  },
  {
    body: `Most audit logs are application-layer: every mutation has to remember to write a history row, and the day someone forgets, the trail has a hole. I prefer to push it down to the database, where it cannot be skipped. Postgres triggers capture every INSERT/UPDATE/DELETE on the audited tables and write the full old and new row as JSONB into one \`audit.record_version\` table.

The table itself is tiny — it stores the operation, a timestamp, the table identity, and the two JSONB snapshots. A BRIN index on the timestamp keeps it cheap even when it grows into the millions, since rows are naturally append-ordered.

\`\`\`ts
export const auditSchema = pgSchema("audit");

export const RecordVersionTable = auditSchema.table(
  "record_version",
  {
    id: serial("id").primaryKey(),
    recordId: text("record_id"),
    oldRecordId: text("old_record_id"),
    op: text("op", { enum: OPERATIONS }),
    ts: createTimestampField("ts").defaultNow().notNull(),
    tableOid: integer("table_oid").notNull(),
    tableName: text("table_name", { enum: AUDITED_TABLES }).notNull(),
    record: jsonb("record"),
    oldRecord: jsonb("old_record"),
  },
  (t) => [
    index("record_version_ts").using("brin", t.ts),
    index("record_version_record_id").using("btree", t.recordId),
  ]
);
\`\`\`

The interesting half is reading it back. The raw rows are snake_cased UUIDs straight from the database; the application speaks camelCase and [TypeIDs](/notes/typeids). So the query layer transforms each snapshot — snake → camel keys, and any field that looks like a UUID is converted back to its prefixed TypeID using a per-table field map.

\`\`\`ts
const convertUuidsToTypeIds = (object: unknown, tableName: AuditedTable) => {
  const result = { ...(object as Record<string, unknown>) };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string" && z.uuid().safeParse(value).success) {
      const prefix = getTypeIdPrefixForField(key, tableName);
      if (prefix) result[key] = typeIdFromUuid(prefix, value);
    }
  }
  return result;
};
\`\`\`

On top of that sits a single \`queryAuditRecordOverTime()\` that, given a table and a record id, returns the record's entire version history — fully typed to that table's select schema. The result is a complete who/when/what-diff trail that the application code never had to maintain, and that survives even raw SQL writes.`,
    date: "2026-05",
    slug: "drizzle-audit-log",
    sourceProject: "appmisha",
    summary:
      "Full row-level change history (who, when, what diff) without any app-layer bookkeeping — Postgres triggers write JSONB versions, and a typed query reconstructs a record's timeline.",
    tags: ["Drizzle", "Postgres", "TypeScript"],
    title: "A type-safe audit log with Postgres triggers and Drizzle",
  },
];

export function getNote(slug: string): Note | undefined {
  return NOTES.find((n) => n.slug === slug);
}
