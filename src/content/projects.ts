import type { VideoId } from "@/content/videos";

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
  coverFit?: "cover" | "contain";
  liveUrl?: string;
  repoUrl?: string;
  stack: string[];
  problem: string;
  approach: string;
  outcome: string;
  highlights?: string[];
  videoIds?: VideoId[];
  relatedProjects?: string[];
  metrics?: ProjectMetric[];
  // Screenshots flow through the same pipeline as trips:
  // public/photos/<slug>/NN.jpg → photos.generated.json
  photos?: string[];
}

// Ordered for the showcase: lead with the most distinctive work.
export const PROJECTS: Project[] = [
  {
    approach:
      "Each specialist agent has a service and examples of its work. A customer chooses the result they need, agrees an offer, and reviews the delivery. My focus is video: explainers, promos, social clips, and editing.",
    client: "Personal product",
    date: "2026",
    highlights: [
      "Specialist agents with visible examples of their work",
      "An agreed offer before the job starts",
      "Video editing, explainers, promos, and social videos",
      "A product built around reviewing the delivered result",
    ],
    liveUrl: "https://swarmm.app/",
    outcome:
      "Swarmm is live at swarmm.app. I am developing the specialist video services alongside video-studio, where I build and test the production workflows and make the examples.",
    problem:
      "Getting a finished video from AI still means choosing tools, writing prompts, assembling clips, and checking the result. I want people to be able to ask a specialist for the finished work.",
    relatedProjects: ["video-studio"],
    role: "Product & engineering",
    slug: "swarmm",
    stack: ["AI agents", "Video generation", "Service workflows"],
    status: "active",
    tagline:
      "Specialist agents you can hire for finished work, with a focus on video.",
    theme: "ai-product",
    title: "Swarmm",
  },
  {
    approach:
      "A shared CLI takes a brief through scripting, images, clips, voice, music, editing, review, and delivery. Reusable brands, character casts, and formats keep a series consistent. Real footage, generated scenes, and animation can all live in the same edit.",
    client: "Personal toolkit",
    date: "2026",
    highlights: [
      "Reusable brands, character casts, and video formats",
      "Real footage, generated scenes, and animated diagrams",
      "Voice, original music, captions, and sound design",
      "Separate creative reviews and technical checks on delivered files",
    ],
    outcome:
      "I use it to make music videos, character shorts, explainers, product promos, and travel films. The selection below includes an original electronic track, my cat reviewing Sidequest, a bee-flight explainer, and an anime remix of our Valencia weekend.",
    problem:
      "A folder of generated clips is a long way from a finished video. The hard part is keeping the story, characters, timing, audio, and captions coherent across the whole piece.",
    relatedProjects: ["swarmm"],
    repoUrl: "https://github.com/grmkris/video-studio",
    role: "Engineering & creative direction",
    slug: "video-studio",
    stack: [
      "TypeScript",
      "Bun",
      "FFmpeg",
      "HyperFrames",
      "Strudel",
      "AI media tools",
    ],
    status: "active",
    tagline: "My workshop for making videos with code, real footage, and AI.",
    theme: "ai-product",
    title: "video-studio",
    videoIds: [
      "afterlight",
      "cat-reviews-sidequest",
      "why-bees-can-fly",
      "valencia-anime",
    ],
  },
  {
    approach:
      "A Stellar wallet that lives inside the AI apps people already use. Each connection gets one allowance on the owner's account: inside it, the app can pay for APIs and people; past it, the exact payment returns to the owner for passkey approval.",
    client: "HackMeridian 2026",
    coverFit: "contain",
    date: "2026",
    highlights: [
      "One allowance per AI app, enforced on the owner's Stellar account",
      "Passkey approval for payments above the allowance",
      "MCP cards and OAuth connection for Claude and other AI hosts",
      "Mainnet flow with USDC, x402, claim links, and revoke",
    ],
    liveUrl: "https://trynod.si",
    metrics: [
      { label: "Network", value: "Stellar mainnet" },
      { label: "Protocol", value: "MCP + OAuth" },
      { label: "Status", value: "Live" },
    ],
    outcome:
      "Built at HackMeridian in Lisbon and verified on Stellar mainnet: an AI app pays inside its allowance, while a larger payment becomes a passkey approval instead of a silent full-wallet handoff.",
    problem:
      "An AI assistant that asks for every payment is not autonomous, but an AI assistant holding the whole wallet is not trustworthy. The missing primitive is a durable, visible amount between those two extremes.",
    repoUrl: "https://github.com/grmkris/hack-meridian-2026",
    role: "Solo build",
    slug: "nod",
    stack: [
      "Bun",
      "Effect",
      "Cloudflare Workers",
      "Stellar",
      "Soroban",
      "MCP",
      "OAuth 2.1",
      "WebAuthn",
      "USDC",
    ],
    status: "live",
    tagline:
      "Give your AI an allowance. Small stuff, it just pays. Big stuff needs your nod.",
    theme: "ai-infra",
    title: "Nod",
  },
  {
    approach:
      "An escrow-backed job protocol where agents publish work, other agents activate against frozen terms, and delivery is reviewed before settlement. The board prepares wallet actions; chain state records the job, review, bond, and payout.",
    client: "Monad Metropolis 2026",
    coverFit: "contain",
    date: "2026",
    highlights: [
      "Agents hire agents for concrete deliverables",
      "Escrow, review, bonds, and settlement are recorded on Monad",
      "Portable reputation follows completed work",
      "Public board, explorer, SDK, MCP surface, and contracts",
    ],
    liveUrl: "https://sidequest.exchange",
    metrics: [
      { label: "Network", value: "Monad mainnet" },
      { label: "Protocol", value: "Agent jobs" },
      { label: "Status", value: "Live" },
    ],
    outcome:
      "Live on Monad: a creator posts a funded job, a worker delivers against the published criteria, and the result becomes part of the worker's on-chain record.",
    problem:
      "Agents can call tools, but they rarely have a credible way to hire one another, escrow the work, prove delivery, and carry reputation to the next job.",
    repoUrl: "https://github.com/grmkris/sidequest",
    role: "Solo build",
    slug: "sidequest",
    stack: [
      "Bun",
      "Effect",
      "Cloudflare Workers",
      "Monad",
      "Solidity",
      "Foundry",
      "MCP",
      "OAuth",
      "TypeScript",
    ],
    status: "live",
    tagline:
      "A job protocol where agents hire agents and the work leaves a receipt.",
    theme: "ai-infra",
    title: "Sidequest",
  },
  {
    approach:
      "A resident agent on Cloudflare with durable conversations, background work, MCP connections, and a wallet that can pay within limits set by its owner. I built the product around visible execution: the owner can inspect tool calls, review approvals, and trace what happened when a task fails.",
    client: "Personal product",
    coverFit: "contain",
    date: "2026",
    highlights: [
      "Resident personal agents with durable conversations and threads",
      "MCP servers, skills, apps, Personas, and subagents in one workspace",
      "Owner-controlled wallet allowances and approval links",
      "Cloudflare Durable Objects, Effect services, and live execution traces",
    ],
    liveUrl: "https://goblin.surf",
    metrics: [
      { label: "Runtime", value: "Cloudflare" },
      { label: "Surface", value: "Agent workspace" },
      { label: "Status", value: "Live" },
    ],
    outcome:
      "Live at goblin.surf as a workspace for agents that keep working after the chat message ends, while leaving the owner in control of tools, connections, and spending.",
    problem:
      "A chat window is a poor home for a resident agent: work disappears into threads, tools are disconnected, and the owner cannot see what happened or stop it cleanly.",
    repoUrl: "https://github.com/grmkris/goblin",
    role: "Solo build",
    slug: "goblin",
    stack: [
      "Bun",
      "TypeScript",
      "Cloudflare Workers",
      "Durable Objects",
      "Effect",
      "MCP",
      "SQLite",
      "USDC",
    ],
    status: "live",
    tagline:
      "Your own goblin, always on: a resident agent with tools, memory, and a wallet.",
    theme: "ai-infra",
    title: "Goblin",
  },
  {
    approach:
      "I built a shared identity and billing foundation, then connected it to products for notes, browsers, email, Telegram, and terminals. Each app keeps its own consent and access boundaries. People use the web interfaces; agents use the same capabilities through MCP.",
    client: "Personal platform",
    coverFit: "contain",
    date: "2026",
    highlights: [
      "One identity and billing layer across the my* apps",
      "MyPlan, MyTab, MyInbox, MyGram, and MyTmux connected through MySI",
      "Separate consent and grant boundaries per product",
      "Dev and production custom domains with Cloudflare Workers and D1",
    ],
    liveUrl: "https://mysi.lol",
    metrics: [
      { label: "Interfaces", value: "Web + MCP" },
      { label: "Runtime", value: "Cloudflare" },
      { label: "Status", value: "Active" },
    ],
    outcome:
      "Deployed products at myplan.lol, mytab.lol, myinbox.lol, mygram.lol, and mytmux.lol, connected through mysi.lol. One account brings the tools into an agent's workspace while keeping access grants separate for each app.",
    problem:
      "Agent tools become brittle when every product invents identity, consent, billing, and MCP connection behavior independently.",
    role: "Product & platform engineering",
    slug: "myapps",
    stack: [
      "Bun",
      "TypeScript",
      "Cloudflare Workers",
      "Effect",
      "D1",
      "R2",
      "Durable Objects",
      "MCP",
      "OAuth",
    ],
    status: "active",
    tagline:
      "A connected suite of agent-native products, built around one human identity.",
    theme: "ai-infra",
    title: "MyApps",
  },
  {
    approach:
      "A wallet and task workspace where a human and an AI share one hosted browser. The host keeps a credit ledger, evaluates spending rules outside the model, and records the task, evidence, payment, and approval as one receipt.",
    client: "ETHOnline 2026",
    date: "2026",
    highlights: [
      "Human and agent share one visible browser session",
      "Spending rules are checked outside the model",
      "Credits, receipts, approvals, and task evidence stay together",
      "Privy, The Graph, Hedera x402, and Browser Use in one flow",
    ],
    metrics: [
      { label: "Networks", value: "Base + Hedera" },
      { label: "Surface", value: "Shared browser" },
      { label: "Status", value: "Shipped" },
    ],
    outcome:
      "Built with Jonas Heinz and Hemang Vora at ETHOnline 2026. The project demonstrated a shared browser, payment policy checks, and recorded Hedera mainnet settlements. Later credit-checkout work has separate verification requirements; those earlier receipts do not establish that it shipped.",
    problem:
      "Agents need browsers and payments to finish useful tasks, but a user should not have to surrender a wallet or blindly accept whatever a model decided to do.",
    repoUrl: "https://github.com/grmkris/Froggy-ETHOnline2026",
    role: "Engineering (team of 3)",
    slug: "froggy",
    stack: [
      "Bun",
      "TypeScript",
      "Browser Use",
      "Privy",
      "The Graph",
      "Hedera",
      "x402",
      "Postgres",
    ],
    status: "shipped",
    tagline:
      "A wallet for your agents: fund tasks, watch the work, and keep receipts.",
    theme: "ai-infra",
    title: "Froggy",
  },
  {
    approach:
      "A B2B compliance and identity platform built from a TypeScript monorepo: provider integrations, smart-contract access gates, zero-knowledge verification, W3C credentials, Polygon ID infrastructure, and The Graph subgraphs behind a shared product surface.",
    client: "AllianceBlock → Nexera → Compilot",
    date: "2022–25",
    highlights: [
      "Scaled the engineering team from 1 to 12",
      "20+ TypeScript microservices and 10+ compliance providers",
      "Smart contracts, ZK verification, W3C credentials, and Polygon ID",
      "Platform deployed across major EVM and non-EVM networks",
    ],
    metrics: [
      { label: "Engineers", value: "1 → 12" },
      { label: "Services", value: "20+" },
      { label: "Users", value: "100k+" },
    ],
    outcome:
      "Led technical development from first architecture through production, moving between hands-on implementation, product direction, and managing three engineering teams.",
    problem:
      "Compliance products have to connect regulated workflows, identity proofs, third-party providers, and on-chain systems without turning each integration into a separate product.",
    role: "CTO / Architect / Lead full-stack engineer",
    slug: "compilot",
    stack: [
      "TypeScript",
      "Node.js",
      "React",
      "Postgres",
      "Drizzle",
      "Solidity",
      "Polygon ID",
      "The Graph",
      "Docker",
      "AWS",
    ],
    status: "shipped",
    tagline:
      "Production compliance and identity infrastructure, from first service to a 12-person engineering team.",
    theme: "saas",
    title: "Compilot / Nexera",
  },
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
    metrics: [
      { label: "Integrations", value: "12" },
      { label: "Apps / packages", value: "8 / 7" },
      { label: "Status", value: "Shipped" },
    ],
    outcome:
      "Shipped as a Bun + Turborepo monorepo with eight apps and seven shared packages, using dual SQLite (agent) + Postgres (cloud) architecture.",
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
    status: "shipped",
    tagline:
      "A self-hostable platform for running autonomous Claude Code agents.",
    theme: "ai-infra",
    title: "Invok",
  },
  {
    approach:
      "A cloud hub keeps an in-memory registry of rigs — real SO-101 arms or MuJoCo sims running as headless agents that only dial out over plain HTTP, so a rig needs no ports, no NAT config, and no SDK. Operators take a single-writer lease and drive from browser keys, their own leader arm, or a Vision Pro. World ID gates execution rights (unverified → HTTP 402), a TeeML-verified model on 0G Compute grades the recorded episode itself, and booking is staking: SlotMarket contracts deployed byte-identical to 0G Galileo and Hedera settle every graded attempt permissionlessly, with the TEE's own EIP-191 signature carried cross-chain and ecrecover-verified on Hedera.",
    client: "ETHGlobal Lisbon 2026",
    date: "2026",
    highlights: [
      "Real SO-101 arm on the venue floor, drivable from anywhere on the internet",
      "World ID gates the arm; TEE-graded episodes decide payment, not the operator's claim",
      "Booking is staking — on-chain FIFO slots, strikes, permissionless settle()",
      "Cross-chain TEE attestation: 0G enclave signature verified on Hedera, no bridge",
    ],
    metrics: [
      { label: "Prizes", value: "World ID Check · 0G 2nd" },
      { label: "Chains", value: "0G + Hedera" },
      { label: "Result", value: "Finalist" },
    ],
    outcome:
      "ETHGlobal Lisbon 2026 finalist; World Identity Check winner and 2nd place 0G Best AI Product. Four contracts live on two testnets, one TypeScript app with hub + rig entrypoints, and a vendored Python driver so a rig costs zero hardware.",
    problem:
      "Robot foundation models have no internet to scrape — they learn from human teleoperation episodes, collected one at a time by operators paid $25–48/hr on-site. That market is closed, local, and trust-based: identity is unverified and success is self-declared.",
    repoUrl:
      "https://github.com/grmkris/eth-global-lisbon-2026-hands-unchained",
    role: "Platform + chain (team of 2)",
    slug: "hands-unchained",
    stack: [
      "Bun",
      "TanStack Start",
      "Effect v4",
      "React 19",
      "Python / LeRobot",
      "MuJoCo",
      "Foundry",
      "World ID",
      "0G Compute",
      "Hedera",
    ],
    status: "shipped",
    tagline:
      "A labor market where verified humans teleoperate real robots — and only AI-graded work gets paid.",
    theme: "ai-infra",
    title: "Hands Unchained",
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
    metrics: [
      { label: "Frame rate", value: "60fps" },
      { label: "Presets", value: "21" },
      { label: "Status", value: "Shipped" },
    ],
    outcome:
      "Shipped as a real-time WebSocket session surface over oRPC, with a credit ledger and on-chain top-ups.",
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
    status: "shipped",
    tagline: "Real-time AI-generated visuals synced to live audio at 60fps.",
    theme: "ai-product",
    title: "Sonara",
  },
  {
    approach:
      "Describe a jam in one sentence; an AI builder agent designs, writes, and deploys it live in under a minute, served in a TikTok-style vertical feed. Email login mints an embedded wallet, every creator claims an ENS name (you.superjam.eth), and jams publish nested beneath it. Mini-apps run sandboxed in iframes behind an SDK bridge, so the host owns every wallet and payment confirmation. Builders are AI agents with on-chain ERC-8004 identity and a USDC reputation stake; payments settle in USDC across a dual-chain setup (Circle Arc for money, Sepolia L1 for ENS identity), gated to verified humans via World ID.",
    client: "ETHGlobal NY 2026",
    date: "2026",
    highlights: [
      "AI builder agent: one sentence → a live, deployed mini-app in under a minute",
      "Nested ENS names (slug.you.superjam.eth) via an ENSIP-10 wildcard resolver",
      "Cross-origin iframe sandbox + SDK bridge — jams never touch your keys",
      "Dual-chain settlement (Circle Arc + Sepolia), USDC payments, World ID humans",
    ],
    metrics: [
      { label: "Apps / packages", value: "6 / 9" },
      { label: "oRPC routers", value: "30" },
      { label: "Status", value: "Shipped" },
    ],
    outcome:
      "Built solo at ETHGlobal NY 2026 as a Bun + Turborepo monorepo with 6 apps, 9 packages, 30 oRPC routers, 18 Postgres tables, and 4 Solidity contracts.",
    problem:
      "Shipping a small web app — let alone an on-chain one — still means wiring up auth, wallets, payments, identity, and a deploy target before anyone can even try it.",
    repoUrl: "https://github.com/grmkris/superjam",
    role: "Solo build",
    slug: "superjam",
    stack: [
      "Bun",
      "Turborepo",
      "Next 16",
      "Hono",
      "oRPC",
      "Drizzle",
      "Postgres",
      "viem",
      "Foundry",
      "Dynamic",
      "World ID",
      "Claude Agent SDK",
    ],
    status: "shipped",
    tagline:
      "A super-app host for the open web — describe a mini-app in a sentence and an AI agent builds, deploys, and publishes it live.",
    theme: "ai-product",
    title: "SuperJam",
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
