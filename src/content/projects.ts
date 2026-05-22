export interface ProjectMetric {
  label: string;
  value: string;
}

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  theme: "ai-infra" | "ai-product" | "saas";
  status: "live" | "active" | "shipped";
  date: string; // "2026" or "2025–26"
  role: string;
  client?: string;
  liveUrl?: string;
  repoUrl?: string;
  stack: string[];
  problem: string;
  approach: string;
  outcome: string;
  highlights?: string[];
  metrics?: ProjectMetric[];
  // Screenshots flow through the same pipeline as trips:
  // public/photos/<slug>/NN.jpg → photos.generated.json
  photos?: string[];
}

// Ordered for the showcase: lead with the most distinctive work.
export const PROJECTS: Project[] = [
  {
    approach:
      "A local-first platform that hosts autonomous Claude Code agents. Five ways to trigger an agent — chat, cron, webhook, email, and API — twelve OAuth integrations (GitHub, Linear, Railway, Vercel, Slack and more) injected as MCP tools, and durable real-time streaming of every tool call and diff. Ships as a one-command installer or a Docker image, with an optional hosted cloud tier.",
    client: "Personal product",
    date: "2026",
    highlights: [
      "Five trigger types: chat, cron, webhook, email, API",
      "Twelve OAuth integrations exposed to agents as MCP tools",
      "Durable real-time streaming of tool calls + code diffs",
      "One-command installer and Docker image; cloud optional",
    ],
    liveUrl: "https://invok.run",
    metrics: [
      { label: "Integrations", value: "12" },
      { label: "Apps / packages", value: "8 / 7" },
      { label: "Status", value: "Live" },
    ],
    outcome:
      "Live at invok.run with hosted docs. Eight apps and seven shared packages in a Bun + Turborepo monorepo, dual SQLite (agent) + Postgres (cloud) architecture.",
    photos: [
      "/photos/invok/01.jpg",
      "/photos/invok/02.jpg",
      "/photos/invok/03.jpg",
      "/photos/invok/04.jpg",
      "/photos/invok/05.jpg",
    ],
    problem:
      "Running AI coding agents reliably means re-inventing the same scaffolding every time — triggers, integrations, real-time streaming, isolation, and a way to actually watch what the agent did.",
    role: "Solo build",
    slug: "invok",
    stack: [
      "Bun",
      "Hono",
      "oRPC",
      "Drizzle",
      "SQLite",
      "Better Auth",
      "React 19",
      "TanStack Router",
      "MCP",
      "Docker",
    ],
    status: "live",
    tagline:
      "A self-hostable platform for running autonomous Claude Code agents.",
    theme: "ai-infra",
    title: "Invok",
  },
  {
    approach:
      "Capture audio from a file, mic, or shared tab and extract ~15 features with Meyda at 60Hz. Parse text and voice intent with Gemini, generate keyframes with fal.ai FLUX.2, and blend them through a WebGL2 feedback-FBO shader with a painterly filter and 21 presets. Songs are recognized via AudD; credits are billed in USDC on Base.",
    client: "Personal product",
    date: "2026",
    highlights: [
      "60fps WebGL2 feedback-FBO render pipeline, no Three.js",
      "Meyda audio analysis → Gemini intent → FLUX.2 keyframes",
      "21 visual presets with shader drift and cross-fade",
      "USDC credit ledger with top-ups on Base",
    ],
    liveUrl: "https://sonara.fm",
    metrics: [
      { label: "Frame rate", value: "60fps" },
      { label: "Presets", value: "21" },
      { label: "Status", value: "Live" },
    ],
    outcome:
      "Live at sonara.fm. A real-time WebSocket session surface over oRPC drives the render loop, with a credit ledger and on-chain top-ups.",
    photos: [
      "/photos/sonara/01.jpg",
      "/photos/sonara/02.jpg",
      "/photos/sonara/03.jpg",
      "/photos/sonara/04.jpg",
      "/photos/sonara/05.jpg",
      "/photos/sonara/06.jpg",
    ],
    problem:
      "Music visualizers are either canned presets or laggy toys. None turn what you are actually hearing — and what you ask for in the moment — into fresh, continuously flowing imagery in real time.",
    role: "Solo build",
    slug: "sonara",
    stack: [
      "Bun",
      "Hono (WebSocket)",
      "oRPC",
      "Drizzle",
      "Postgres",
      "WebGL2",
      "Meyda",
      "fal.ai FLUX.2",
      "Gemini",
      "Base / USDC",
    ],
    status: "live",
    tagline: "Real-time AI-generated visuals synced to live audio at 60fps.",
    theme: "ai-product",
    title: "Sonara",
  },
  {
    approach:
      "Users photograph clothing; AI categorizes, color-tags, and scores it. Forensic scans detect items in any photo, virtual try-on generates outfit images, and a stylist chat plus fit clinic close the loop. Built on multi-provider AI (Gemini, Anthropic, Groq, XAI) with a fallback strategy, five dedicated BullMQ workers for the image pipelines, and a presigned-S3 media lifecycle behind imgproxy — shared across a web PWA and a native Expo app.",
    client: "Personal product",
    date: "2025–26",
    highlights: [
      "Virtual try-on, outfit forensics, color analysis, fit clinic",
      "Multi-provider AI (Gemini/Anthropic/Groq/XAI) with fallback",
      "Five dedicated BullMQ workers for image pipelines",
      "One codebase across web PWA + native Expo",
    ],
    metrics: [
      { label: "Domain tables", value: "22" },
      { label: "Workers", value: "5" },
      { label: "Surfaces", value: "Web + native" },
    ],
    outcome:
      "22 domain tables, 14 API sub-routers, 24 services, and 5 background workers, shared across web and native from one Turborepo.",
    problem:
      "Getting dressed well is a data problem hiding as a taste problem: people have wardrobes they can't see, can't combine, and can't try things against without a mirror and an hour.",
    role: "Solo build",
    slug: "stylelab",
    stack: [
      "Bun",
      "Next 16",
      "Expo / React Native",
      "Hono",
      "oRPC",
      "Drizzle",
      "Postgres",
      "Redis",
      "BullMQ",
      "MinIO / S3",
      "imgproxy",
      "PostHog",
    ],
    status: "active",
    tagline:
      "A full-stack AI fashion app — virtual try-on, wardrobe, and styling, across web and native mobile.",
    theme: "ai-product",
    title: "StyleLab",
  },
  {
    // TODO: rename — Kris is choosing a new product name. Update title + slug.
    approach:
      "One multi-tenant platform with dynamic [locale]/[org]/[workspace] routing and sixteen feature domains — commerce (orders, products, inventory, payments, subscriptions), CMS, customers, forms, documents, tasks, payroll and more — split across an admin dashboard and a customer-facing storefront, with OpenAPI docs and OpenTelemetry/Pino observability.",
    client: "Personal product",
    date: "2025–26",
    highlights: [
      "Dynamic [locale]/[org]/[workspace] multi-tenant routing",
      "16 independent feature domains",
      "Admin dashboard + customer storefront from one platform",
      "OpenAPI docs + OpenTelemetry/Pino observability",
    ],
    metrics: [
      { label: "Feature domains", value: "16" },
      { label: "Apps", value: "Admin + storefront" },
    ],
    outcome:
      "16 feature domains across admin + storefront apps, with tenant isolation enforced at the routing and data layers.",
    problem:
      "Small businesses are told to glue together a storefront, a CMS, a CRM, and an ops dashboard from five different SaaS bills — none of which talk to each other.",
    role: "Solo build",
    slug: "appmisha",
    stack: [
      "Bun",
      "Next 16",
      "Hono",
      "oRPC",
      "Drizzle",
      "Postgres",
      "Redis",
      "MinIO / S3",
      "Better Auth",
      "OpenTelemetry",
    ],
    status: "active",
    tagline:
      "A multi-tenant commerce and CMS platform with separate admin and storefront apps.",
    theme: "saas",
    title: "Appmisha",
  },
  {
    approach:
      "A platform that syncs with the Syrve POS, models waybills, drivers and vehicles, maps suppliers, products and units of measure with conversions, and bridges the RSGE tax system — all behind a shared auth and multi-tenant layer with 25 type-safe routers.",
    client: "F&B logistics client",
    date: "2025–26",
    highlights: [
      "Syrve POS integration (OAuth + unit mapping)",
      "RSGE tax-system bridge",
      "Waybill / driver / vehicle domain modeling",
      "Supplier/product/unit mapping with conversions",
    ],
    metrics: [
      { label: "Routers", value: "25" },
      { label: "Integrations", value: "Syrve + RSGE" },
      { label: "Type", value: "Client" },
    ],
    outcome:
      "Shipped client system: 25 routers, live Syrve + RSGE integrations, with access-control test coverage.",
    problem:
      "Restaurant groups run their floor on a POS, their stock in spreadsheets, and their tax compliance by hand — three sources of truth that drift apart daily.",
    role: "Client engagement",
    slug: "zednabi",
    stack: [
      "Bun",
      "Next 16",
      "Hono",
      "oRPC",
      "Drizzle",
      "Postgres",
      "Better Auth",
      "Syrve API",
      "RSGE",
    ],
    status: "shipped",
    tagline:
      "A restaurant supply-chain platform integrating POS, inventory, and logistics.",
    theme: "saas",
    title: "Zednabi",
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
