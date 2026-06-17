#!/usr/bin/env bun
/**
 * Stage 3 — review: a LOCAL-ONLY dashboard to approve/reorder picks for ALL
 * curated trips from one browser tab.
 *
 *   bun run photos:review            # dashboard of every curated trip
 *   bun run photos:review <slug>     # same, opens with <slug> active
 *
 * A single Bun.serve (127.0.0.1 only, outside src/app — candidate photos never
 * ship to the public site) lists each trip that has a scored.json, shows it as
 * a tab, and lazy-loads that trip's photos when you open it. You toggle keep,
 * drag the selected set into order, and Save → .cache/photos/<slug>/selection.json.
 * Ctrl-C when done.
 *
 * Routes:
 *   GET  /                  app shell + trip list
 *   GET  /api/trip/:slug    { slug, title, location, photos, selected }
 *   GET  /img/:slug/:uuid       the ≤1024px preview / video poster from .cache
 *   GET  /api/frames/:slug/:uuid  download clip on demand → ffmpeg frame strip
 *   GET  /frame/:slug/:uuid/:idx  serve one extracted frame
 *   POST /api/save/:slug        body { uuids, frames } → selection.json
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  cachePaths,
  ensureVideo,
  extractFrame,
  ffprobeDuration,
  getTrip,
  listCachedSlugs,
  log,
  parseArgs,
  readJson,
  writeJson,
} from "./shared";

const FRAME_COUNT = 12;
const FRAME_WIDTH = 1024;

interface Scored {
  uuid: string;
  kind?: "photo" | "video";
  duration?: number;
  date: string | null;
  place: string | null;
  score: number;
  tier?: string;
  scene?: string;
  offTrip: boolean;
  exclude: boolean;
  caption: string;
  tags: string[];
  keep: boolean;
}

interface Selection {
  slug: string;
  savedAt: string;
  uuids: string[];
  frames?: Record<string, number>;
}

interface TripSummary {
  slug: string;
  title: string;
  location: string;
  usable: number;
  selected: number;
}

interface TripPayload extends TripSummary {
  photos: Scored[];
  selectedUuids: string[];
  frames: Record<string, number>;
}

/** Initial selection = saved selection.json if present, else the AI keep flags. */
async function selectionFor(slug: string, scored: Scored[]): Promise<string[]> {
  const prior = await readJson<Selection | null>(
    cachePaths(slug).selectionJson,
    null
  );
  return prior?.uuids ?? scored.filter((s) => s.keep).map((s) => s.uuid);
}

/** Every trip with a scored.json, summarised for the tab strip. */
async function listCuratedTrips(): Promise<TripSummary[]> {
  const out: TripSummary[] = [];
  for (const slug of await listCachedSlugs()) {
    const scored = await readJson<Scored[]>(cachePaths(slug).scoredJson, []);
    if (scored.length === 0) {
      continue;
    }
    let trip: { title: string; location: string };
    try {
      trip = getTrip(slug);
    } catch {
      trip = { location: "", title: slug };
    }
    const selected = await selectionFor(slug, scored);
    out.push({
      location: trip.location,
      selected: selected.length,
      slug,
      title: trip.title,
      usable: scored.filter((s) => !(s.offTrip || s.exclude)).length,
    });
  }
  return out;
}

async function tripPayload(slug: string): Promise<TripPayload | null> {
  const scored = await readJson<Scored[]>(cachePaths(slug).scoredJson, []);
  if (scored.length === 0) {
    return null;
  }
  let trip: { title: string; location: string };
  try {
    trip = getTrip(slug);
  } catch {
    trip = { location: "", title: slug };
  }
  const selected = await selectionFor(slug, scored);
  const prior = await readJson<Selection | null>(
    cachePaths(slug).selectionJson,
    null
  );
  return {
    frames: prior?.frames ?? {},
    location: trip.location,
    photos: scored,
    selected: selected.length,
    selectedUuids: selected,
    slug,
    title: trip.title,
    usable: scored.filter((s) => !(s.offTrip || s.exclude)).length,
  };
}

/** Download a clip on demand and extract an evenly-spaced frame strip. */
async function frameStrip(
  slug: string,
  uuid: string
): Promise<{ idx: number; t: number }[] | null> {
  const fdir = join(cachePaths(slug).framesDir, uuid);
  const manifest = join(fdir, "frames.json");
  if (existsSync(manifest)) {
    return await readJson<{ idx: number; t: number }[]>(manifest, []);
  }
  const video = await ensureVideo(slug, uuid);
  if (!video) {
    return null;
  }
  await mkdir(fdir, { recursive: true });
  const dur = (await ffprobeDuration(video)) || 1;
  const out: { idx: number; t: number }[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = (dur * (i + 0.5)) / FRAME_COUNT;
    const ok = await extractFrame(
      video,
      t,
      join(fdir, `${i}.jpg`),
      FRAME_WIDTH
    );
    if (ok) {
      out.push({ idx: i, t });
    }
  }
  await writeJson(manifest, out);
  return out;
}

function appShell(trips: TripSummary[], active: string): string {
  const bootstrap = JSON.stringify({ active, trips });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>photo review</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d0d0f; color: #e8e8ea; font: 14px/1.5 -apple-system, system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 10; background: #141417; border-bottom: 1px solid #26262b; }
  #tabs { display: flex; gap: 4px; overflow-x: auto; padding: 8px 12px 0; }
  .tab { flex: 0 0 auto; padding: 7px 13px; border: 1px solid #26262b; border-bottom: none; border-radius: 8px 8px 0 0; background: #1a1a1f; color: #9a9aa2; cursor: pointer; white-space: nowrap; font-size: 13px; }
  .tab.active { background: #0d0d0f; color: #e8e8ea; border-color: #3a3a42; }
  .tab .n { color: #6fcf97; font-variant-numeric: tabular-nums; }
  .tab .dot { color: #e0a23b; }
  .bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 10px 18px; }
  .bar h1 { font-size: 15px; margin: 0; font-weight: 600; }
  .bar .sub { color: #8a8a92; font-size: 12px; }
  .count { font-variant-numeric: tabular-nums; }
  button { font: inherit; border: 1px solid #3a3a42; background: #1d1d22; color: #e8e8ea; border-radius: 7px; padding: 7px 14px; cursor: pointer; }
  button.primary { background: #2f6f4f; border-color: #2f6f4f; }
  button:hover { border-color: #5a5a66; }
  label.toggle { display: inline-flex; align-items: center; gap: 6px; color: #8a8a92; font-size: 12px; cursor: pointer; }
  #tray { display: flex; gap: 6px; overflow-x: auto; padding: 10px 18px; background: #101013; border-bottom: 1px solid #26262b; min-height: 64px; }
  #tray .chip { position: relative; flex: 0 0 auto; width: 44px; height: 44px; border-radius: 6px; overflow: hidden; border: 2px solid #2f6f4f; cursor: grab; }
  #tray .chip img { width: 100%; height: 100%; object-fit: cover; }
  #tray .chip .n { position: absolute; top: 0; left: 0; background: #2f6f4f; color: #fff; font-size: 10px; padding: 0 3px; border-bottom-right-radius: 5px; }
  #tray .empty { color: #555; font-size: 12px; align-self: center; }
  main { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .card { background: #161619; border: 2px solid transparent; border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color .12s; }
  .card.kept { border-color: #2f6f4f; }
  .card .imgwrap { position: relative; aspect-ratio: 3/4; background: #000; }
  .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card .badge { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,.7); border-radius: 5px; padding: 1px 6px; font-size: 12px; font-variant-numeric: tabular-nums; }
  .card .kn { position: absolute; top: 6px; right: 6px; background: #2f6f4f; color: #fff; border-radius: 5px; padding: 1px 7px; font-size: 12px; display: none; }
  .card.kept .kn { display: block; }
  .card .flags { position: absolute; bottom: 6px; left: 6px; display: flex; gap: 4px; }
  .card .flag { font-size: 10px; padding: 1px 5px; border-radius: 4px; background: #5a2530; color: #ffd7dd; }
  .card .meta { padding: 8px 10px; }
  .card .cap { font-size: 12px; color: #cfcfd4; }
  .card .place { font-size: 11px; color: #7a7a82; margin-top: 2px; }
  .card .tags { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 3px; }
  .card .tag { font-size: 10px; color: #8a8a92; background: #232329; padding: 0 5px; border-radius: 4px; }
  .saved { color: #6fcf97; }
  .empty-state { padding: 40px 18px; color: #8a8a92; }
  .card .vbadge { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,.72); border-radius: 999px; min-width: 22px; height: 22px; padding: 0 7px; display: flex; align-items: center; justify-content: center; font-size: 11px; gap: 3px; }
  #modal { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.85); display: none; align-items: flex-start; justify-content: center; padding: 32px 16px; overflow: auto; }
  #modal.open { display: flex; }
  #modal .panel { background: #161619; border: 1px solid #3a3a42; border-radius: 12px; max-width: 1040px; width: 100%; padding: 16px; }
  #modal h3 { margin: 0 0 2px; font-size: 14px; }
  #modal .hint { color: #8a8a92; font-size: 12px; margin-bottom: 12px; }
  #modal .modclose { float: right; padding: 4px 10px; }
  #frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 8px; }
  #frames .frame { position: relative; border: 2px solid transparent; border-radius: 8px; overflow: hidden; cursor: pointer; }
  #frames .frame.sel { border-color: #2f6f4f; }
  #frames .frame img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; }
  #frames .frame .t { position: absolute; bottom: 2px; left: 2px; background: rgba(0,0,0,.7); font-size: 10px; padding: 0 4px; border-radius: 3px; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<header>
  <div id="tabs"></div>
  <div class="bar">
    <h1 id="title">—</h1>
    <span class="sub count" id="count">0 selected</span>
    <label class="toggle"><input type="checkbox" id="showAll" /> show excluded / off-trip</label>
    <span style="flex:1"></span>
    <span class="sub" id="status"></span>
    <button class="primary" id="save">Save</button>
  </div>
</header>
<div id="tray"></div>
<main id="grid"></main>
<div id="modal"><div class="panel"><button class="modclose" id="modclose">✕ close</button><h3 id="modtitle">Pick a frame</h3><div class="hint" id="modhint"></div><div id="frames"></div></div></div>
<script>
const BOOT = ${bootstrap};
const state = {};            // slug -> { photos, selectedUuids, dirty, loaded }
let active = BOOT.active;

const $ = (id) => document.getElementById(id);
const tabsEl = $('tabs'), gridEl = $('grid'), trayEl = $('tray');

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const t of BOOT.trips) {
    const st = state[t.slug];
    const count = st ? st.selectedUuids.length : t.selected;
    const dirty = st && st.dirty;
    const el = document.createElement('div');
    el.className = 'tab' + (t.slug === active ? ' active' : '');
    el.innerHTML = t.title + ' <span class="n">' + count + '</span>' + (dirty ? ' <span class="dot">●</span>' : '');
    el.addEventListener('click', () => switchTo(t.slug));
    tabsEl.appendChild(el);
  }
}

async function loadTrip(slug) {
  if (state[slug]) return state[slug];
  const res = await fetch('/api/trip/' + slug);
  const data = await res.json();
  state[slug] = { photos: data.photos, byUuid: new Map(data.photos.map(p => [p.uuid, p])), selectedUuids: data.selectedUuids.slice(), frames: data.frames || {}, frameUrl: {}, dirty: false, loaded: true };
  return state[slug];
}

async function switchTo(slug) {
  active = slug;
  $('status').textContent = '';
  renderTabs();
  $('title').textContent = 'loading…';
  await loadTrip(slug);
  const meta = BOOT.trips.find(t => t.slug === slug);
  $('title').textContent = meta.title + (meta.location ? ' — ' + meta.location : '');
  renderAll();
}

function cur() { return state[active]; }
function isShown(p) {
  if ($('showAll').checked) return true;
  return cur().selectedUuids.includes(p.uuid) || !(p.exclude || p.offTrip);
}
function imgSrc(uuid) { return '/img/' + active + '/' + uuid; }
function isVideo(uuid) { const p = cur().byUuid.get(uuid); return p && p.kind === 'video'; }
// Selected video shows the chosen frame (if picked this session); else poster.
function thumbFor(uuid) { return cur().frameUrl[uuid] || imgSrc(uuid); }

function renderGrid() {
  gridEl.innerHTML = '';
  const sel = cur().selectedUuids;
  for (const p of cur().photos) {
    if (!isShown(p)) continue;
    const kept = sel.includes(p.uuid);
    const vid = p.kind === 'video';
    const card = document.createElement('div');
    card.className = 'card' + (kept ? ' kept' : '');
    const flags = [];
    if (p.exclude) flags.push('excluded');
    if (p.offTrip) flags.push('off-trip');
    const framed = vid && cur().frames[p.uuid] != null;
    card.innerHTML =
      '<div class="imgwrap"><img loading="lazy" src="'+thumbFor(p.uuid)+'" />' +
      '<span class="badge">'+(p.tier ? p.tier+' · ' : '')+p.score+'</span>' +
      '<span class="kn">'+(kept ? (sel.indexOf(p.uuid)+1) : '')+'</span>' +
      (vid ? '<span class="vbadge">▶'+(framed ? ' '+Math.round(cur().frames[p.uuid])+'s' : '')+'</span>' : '') +
      '<div class="flags">'+flags.map(f=>'<span class="flag">'+f+'</span>').join('')+'</div></div>' +
      '<div class="meta"><div class="cap">'+(p.caption||'')+(vid ? ' <em style="color:#8a8a92">(video — click to pick frame)</em>' : '')+'</div>' +
      (p.scene ? '<div class="place">▸ '+p.scene+'</div>' : '') +
      (p.place ? '<div class="place">'+p.place+'</div>' : '') +
      '<div class="tags">'+(p.tags||[]).map(t=>'<span class="tag">'+t+'</span>').join('')+'</div></div>';
    card.addEventListener('click', () => vid ? openPicker(p.uuid) : toggle(p.uuid));
    gridEl.appendChild(card);
  }
}
function renderTray() {
  const sel = cur().selectedUuids;
  if (sel.length === 0) { trayEl.innerHTML = '<span class="empty">selected photos appear here — drag to reorder</span>'; return; }
  trayEl.innerHTML = '';
  sel.forEach((uuid, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip'; chip.draggable = true;
    chip.innerHTML = '<span class="n">'+(i+1)+'</span><img src="'+thumbFor(uuid)+'" />';
    chip.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', uuid));
    chip.addEventListener('dragover', e => e.preventDefault());
    chip.addEventListener('drop', e => {
      e.preventDefault();
      const from = e.dataTransfer.getData('text/plain');
      if (from === uuid) return;
      const arr = cur().selectedUuids;
      arr.splice(arr.indexOf(from), 1);
      arr.splice(arr.indexOf(uuid), 0, from);
      markDirty(); renderAll();
    });
    chip.addEventListener('click', () => toggle(uuid));
    trayEl.appendChild(chip);
  });
}
function toggle(uuid) {
  const arr = cur().selectedUuids;
  const i = arr.indexOf(uuid);
  if (i >= 0) arr.splice(i, 1); else arr.push(uuid);
  markDirty(); renderAll();
}
function markDirty() { cur().dirty = true; }

// Frame picker: download the clip on demand, show a strip, pick one frame.
function closeModal() { $('modal').classList.remove('open'); }
async function openPicker(uuid) {
  const slug = active;
  const p = cur().byUuid.get(uuid);
  $('modtitle').textContent = (p && p.caption) || 'Pick a frame';
  $('modhint').textContent = 'Downloading clip & extracting frames (first time can take a few seconds)…';
  $('frames').innerHTML = '';
  $('modal').classList.add('open');
  let strip;
  try {
    const res = await fetch('/api/frames/' + slug + '/' + uuid);
    if (!res.ok) throw new Error('clip unavailable');
    strip = await res.json();
  } catch (e) {
    $('modhint').innerHTML = "This clip isn't on your Mac yet. Videos aren't auto-downloaded (bulk video fetches trigger iCloud rate-limits). In Photos.app, download this clip's original, then retry — or pick a photo instead.";
    return;
  }
  if (active !== slug) return; // user switched tabs while loading
  $('modhint').textContent = 'Click the frame you want in the gallery.';
  const chosen = cur().frames[uuid];
  $('frames').innerHTML = '';
  for (const f of strip) {
    const sel = chosen != null && Math.abs(chosen - f.t) < 0.01;
    const el = document.createElement('div');
    el.className = 'frame' + (sel ? ' sel' : '');
    el.innerHTML = '<img src="'+f.url+'" /><span class="t">'+Math.round(f.t)+'s</span>';
    el.addEventListener('click', () => {
      cur().frames[uuid] = f.t;
      cur().frameUrl[uuid] = f.url;
      if (!cur().selectedUuids.includes(uuid)) cur().selectedUuids.push(uuid);
      markDirty(); closeModal(); renderAll();
    });
    $('frames').appendChild(el);
  }
}
$('modclose').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
function renderAll() {
  $('count').textContent = cur().selectedUuids.length + ' selected';
  renderTabs(); renderTray(); renderGrid();
}
$('showAll').addEventListener('change', renderGrid);
$('save').addEventListener('click', async () => {
  $('status').textContent = 'saving…'; $('status').className = 'sub';
  const res = await fetch('/api/save/' + active, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ uuids: cur().selectedUuids, frames: cur().frames }) });
  if (res.ok) { cur().dirty = false; renderTabs(); $('status').textContent = 'saved ' + cur().selectedUuids.length; $('status').className = 'sub saved'; }
  else { $('status').textContent = 'save failed'; }
});
window.addEventListener('beforeunload', (e) => {
  if (Object.values(state).some(s => s.dirty)) { e.preventDefault(); e.returnValue = ''; }
});

if (BOOT.trips.length === 0) {
  document.querySelector('main').innerHTML = '<div class="empty-state">No curated trips yet. Run <code>bun run photos:curate &lt;slug&gt;</code> first.</div>';
} else {
  renderTabs();
  switchTo(active);
}
</script>
</body>
</html>`;
}

async function main(): Promise<void> {
  const { slug } = parseArgs();
  const trips = await listCuratedTrips();
  const active = slug || trips[0]?.slug || "";

  const server = Bun.serve({
    async fetch(req) {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);

      if (url.pathname === "/") {
        return new Response(appShell(trips, active), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // GET /api/trip/:slug
      if (parts[0] === "api" && parts[1] === "trip" && parts[2]) {
        const payload = await tripPayload(decodeURIComponent(parts[2]));
        return payload
          ? Response.json(payload)
          : new Response("not found", { status: 404 });
      }

      // GET /img/:slug/:uuid
      if (parts[0] === "img" && parts[1] && parts[2]) {
        const file = join(
          cachePaths(decodeURIComponent(parts[1])).candidatesDir,
          `${decodeURIComponent(parts[2])}.jpg`
        );
        return existsSync(file)
          ? new Response(Bun.file(file))
          : new Response("not found", { status: 404 });
      }

      // GET /api/frames/:slug/:uuid  (downloads clip on demand → frame strip)
      if (parts[0] === "api" && parts[1] === "frames" && parts[2] && parts[3]) {
        const fSlug = decodeURIComponent(parts[2]);
        const fUuid = decodeURIComponent(parts[3]);
        const strip = await frameStrip(fSlug, fUuid);
        if (!strip) {
          return new Response("clip unavailable", { status: 502 });
        }
        return Response.json(
          strip.map((f) => ({ ...f, url: `/frame/${fSlug}/${fUuid}/${f.idx}` }))
        );
      }

      // GET /frame/:slug/:uuid/:idx
      if (parts[0] === "frame" && parts[1] && parts[2] && parts[3]) {
        const file = join(
          cachePaths(decodeURIComponent(parts[1])).framesDir,
          decodeURIComponent(parts[2]),
          `${decodeURIComponent(parts[3])}.jpg`
        );
        return existsSync(file)
          ? new Response(Bun.file(file))
          : new Response("not found", { status: 404 });
      }

      // POST /api/save/:slug
      if (
        parts[0] === "api" &&
        parts[1] === "save" &&
        parts[2] &&
        req.method === "POST"
      ) {
        const targetSlug = decodeURIComponent(parts[2]);
        const body = (await req.json()) as {
          uuids: string[];
          frames?: Record<string, number>;
        };
        const selection: Selection = {
          frames: body.frames ?? {},
          savedAt: new Date().toISOString(),
          slug: targetSlug,
          uuids: body.uuids,
        };
        await writeJson(cachePaths(targetSlug).selectionJson, selection);
        log(`  ✓ saved ${body.uuids.length} picks → ${targetSlug}`);
        return Response.json({ ok: true });
      }

      return new Response("not found", { status: 404 });
    },
    hostname: "127.0.0.1",
    // Clip downloads (on-demand, throttled) can take a while — raise from 10s.
    idleTimeout: 255,
    port: 0,
  });

  const reviewUrl = `http://127.0.0.1:${server.port}`;
  log(
    `review dashboard: ${trips.length} curated trip(s)${trips.length ? ` — ${trips.map((t) => t.slug).join(", ")}` : ""}`
  );
  log(`  → ${reviewUrl}  (Ctrl-C when done)`);
  Bun.spawn(["open", reviewUrl]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
