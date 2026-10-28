# Personal Page Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Valencia (17–19 October), Swarmm, video-studio, and three homepage videos to kris.gg.

**Architecture:** Extend existing static content records and use one native-video component. Host content-hashed media on the existing R2 origin; keep captions in the site. Preserve existing galleries and prerendered routes.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, Bun, Sharp, FFmpeg, R2.

**Spec:** User-approved proposal in this conversation: three homepage films (Afterlight, cat reviews Sidequest, Why bees can fly); Valencia photos with the real trip film and anime remix; linked Swarmm and video-studio Building entries.

## Global Constraints

- Match the existing design, typography and content patterns.
- No generation, dependencies, database work, or unrelated changes.
- No autoplay; preload none; native controls and captions.
- Keep old photo manifests intact. Select distinct Valencia scenes, favouring photos containing Kris.
- Commit to dev; verify dev.kris.gg; promote only through a reviewed merge-commit PR.

## Review Focus

- Portrait and landscape films keep their aspect ratios at 375px and desktop widths.
- No video bytes load until playback; posters load and controls work.
- Captions and source URLs resolve, seeking works on R2.
- Existing photo metadata survives the targeted manifest addition.
- New static routes, photo permalinks and sitemap entries resolve.

### Task 1: Prepare media

**Files:** R2 videos and Valencia photos; src/content/videos.generated.json; src/content/photos.generated.json; src/content/photos.meta.json; public/captions/\*.vtt.
**Interfaces:** Generated video records contain src, poster, width, height and duration; photo records match existing PhotoMeta.

- [ ] Select 8–12 distinct Valencia photos from the existing export.
- [ ] Compress five finished films, extract posters, derive captions from existing timings.
- [ ] Publish content-hashed assets with the existing credentials, without logging secrets.
- [ ] Verify HTTP responses, video range requests, caption validity and preserved old photo records.

### Task 2: Content and presentation

**Files:** src/content/{projects,trips,flags,videos}.ts; src/components/video-gallery.tsx; src/app/page.tsx; src/app/building/[slug]/page.tsx; src/app/journal/[slug]/trip-view.tsx; public/llms.txt.
**Interfaces:** VideoId identifies entries in VIDEOS. Optional videoIds on Project and Trip select their films. VideoGallery accepts readonly VideoId[].

- [ ] Add truthful Swarmm and video-studio entries with reciprocal links.
- [ ] Add Valencia October trip, flag, selected photos and both films.
- [ ] Render native video figures with posters, none preloading, captions and descriptions.
- [ ] Add three homepage videos and a current-work line; keep existing layout language.

### Task 3: Verification and delivery

- [ ] Typecheck; run required formatter; inspect changed-file scope; run tests and verify.
- [ ] Build and inspect static routes.
- [ ] Browser-check desktop and 375px layouts, controls, captions, media loading and gallery permalinks.
- [ ] Commit specific files, push dev, verify dev.kris.gg and prepare reviewed dev-to-main PR.
