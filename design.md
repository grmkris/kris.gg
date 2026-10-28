# kris.gg public design system

Hallmark v2 full redesign, approved scope: all public pages and article templates.
Direction: dark editorial, bold and cinematic. Lead with work; retain personal photographs.
Audience: people considering hiring or collaborating with Kristjan on end-to-end products.

## Material and invariants

All data in src/content stays unchanged. Preserve all routes, outbound links, metadata,
article bodies, project facts, contact behavior, gallery controls, and photo permalinks.
Use existing R2 images only. No invented claims, stock imagery, customer logos or testimonials.
Private /stash and /routes implementation and existing shadcn base tokens stay unchanged.

## Palette and typography

Brand route, not a light catalogue theme: preserve the dark, cream and rust identity.
Public roles live in src/tokens.css, exported through Tailwind @theme static:
--color-paper (dark warm canvas), --color-paper-2 / -3 (surfaces), --color-ink,
--color-ink-2, --color-ink-muted (readable supporting text), --color-rule,
--color-signal (rust), --color-signal-ink, --color-focus.
Do not use --color-muted or --color-accent: these retain private shadcn meanings.
Every colour references a token; no literal colours in markup/styles.
Fraunces through --font-public-display; Hanken Grotesk through --font-body.
--font-outlier only for code. One weight/style/colour per heading. No italic heads.
Body at least 16px; labels at least 14px. Labels/nav sentence case, untracked.
No eyebrows, decorative dots, emoji icons, middle-dot metadata or arrow suffixes.

## Shared structure

.public-page on each main; .public-container is the shared capped centred container
(1312px max content box, 24px side space desktop / 16px mobile).
.public-title for page title; .public-section-title for section heads;
.public-lead, .public-body, .public-meta, .public-caption, .public-tag for text.
.public-action is the one filled primary; .public-link for underlined text actions.
.public-image-frame for real images, with --cover or --contain suffix as appropriate.
.public-gallery wraps PhotoGallery. It preserves all lightbox functionality.
Use <PublicFooter /> from @/components/public-footer at each public page's end.
The root agent owns all shared classes, base.css, tokens.css, layout and shared components.

Use CSS grid minmax(0,1fr) tracks; no fixed widths that overflow mobile. Cap large widths.
Spacing uses --space-* and --section-gap-* tokens. Shared column gap --gap-columns.
No card-inside-card, fake browser frames, gradients, noise texture, or decorative icons.
Use hierarchy, real images, rules and whitespace. Keep image proportions; screenshots never crop.
Focus-visible outlines must appear instantly. Controls get 44px hit targets, hover and active states.
Any motion uses transform/opacity with reduced-motion fallback. Content visible without scripts.

## Composition by route

- Home: split studio, work-led first screen with Nod screenshot, a short introduction and contact action.
  Then selected current products, real Compilot experience, personal photography/journal, notes, contact.
- Building: visual portfolio for the four screenshot-bearing current products. Preserve every project;
  use an editorial index for the remaining projects, with their actual status and role.
- Project detail: clear title/role/date, screenshot shown intact, facts as semantic dl, existing
  problem/approach/outcome/highlights, existing live/repo links, gallery. Reading measure 60–75ch.
- Journal: editorial archive with visible thumbnail images and strong date/location/title hierarchy.
  Preserve all 58 entries, years, year navigation and ids. No hover-only important content.
- Trip detail: actual photo when available, strong title, date/location/event/credits, all body links,
  existing PhotoGallery and deep-link behavior. Text-only stories are intentional documents.
- Notes: a concise typographic index; detailed notes are long documents with all original code and links.

No new logic or fake UI states. Metadata and static generation remain intact.
Keep long-form factual copy even when it exceeds the marketing screen-word budget; redesign mode
preserves it and reports that budget as a note. Public headings may be tightened without changing facts.

## Review

Hallmark before record: .hallmark/before.json, seven representative public routes at localhost:3002.
Root integrates and runs sloplint --render --kept, hero and finish reviews in fresh agents, TypeScript,
scoped lint, tests, build and browser verification. Never claim a gate pass without the measured output.
