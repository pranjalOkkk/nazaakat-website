# Status

Last updated: 23 Aug 2026

This file exists so a new chat, or a future you, can pick this project back up
without re-deriving the reasoning behind it or re-pasting a handoff doc.
Contact details, address, hours and palette hex values already live in code
(`BRAND` and `THEMES` in `index.html`) and aren't repeated here — this covers
**where things stand right now** and **why they're built the way they are**.

---

## Current state

- Static, no-build site: `index.html` (1202 lines — markup, CSS and app JS in
  one file) + `products.js` (the catalogue, a single `const PRODUCTS = [...]`,
  23 products). 5 products carry real photos (`nz-107`, `nz-108`, `nz-307`,
  `nz-000001`, `nz-000002`); the other 18 render generated SVG line-art on the
  product's line colour via `art()`.
- Deployed on Vercel, auto-deploy on push to `main`, no staging environment —
  every push to `main` goes live.
- Domains and DNS: not visible from this repo at all. Vercel domain/redirect
  configuration and GoDaddy DNS records live outside the working tree, so
  whether `nazaakatjewels.com`/`nazaakatjewels.in` are wired up correctly (and
  which redirect codes are in effect) **cannot be confirmed from the code** —
  treat that as a manual check in the Vercel dashboard, not something a future
  session can verify by reading files.
- Repo is public: `github.com/pranjalOkkk/nazaakat-website`.
- No `package.json`, no `README.md`, no `node_modules` — the two `.mjs`
  scripts (below) are run ad hoc with plain `node`, not part of the site's
  runtime or build.

## Changes

Most recent first.

- **Kada split out as its own product type; missing-field and badge
  rendering hardened** (commit `98547ce`). `TYPES` now has `"kada"` as a
  sibling of `"bangles"` instead of folding them together — an
  `intake-station`-submitted kada used to render the literal string
  `undefined` in the card line-tag and PDP eyebrow, with no filter checkbox
  to find it. `nz-105` (Antique Gold Kada Pair) retyped from `bangles` to
  `kada`; `art()` aliases the kada type to the bangles drawing rather than
  adding a new SVG. Added `lineLabel()`/`lineFull()`/`typeLabel()` helpers so
  `card()`, `piecePage()` and the cart meta line fall back to the raw value
  instead of throwing when `line`/`type` doesn't match a known key. `esc()`
  now treats `null`/`undefined` as empty string; the PDP specs list and
  description sentence are built from filtered fragments so an absent
  `size`/`incl`/`plating`/`stones`/`occ` drops its row or clause instead of
  printing `"null"` or `"undefined"` — because `intake-station` submits
  `size: null` for five of its nine types and no longer collects `incl` at
  all. `badge` became a controlled vocabulary: a `BADGES` object in SHOP
  CONFIG with six keys (`bestseller`, `new`, `few-left`, `back-in-stock`,
  `customer-favourite`, `handcrafted`), replacing the old
  `=== 'new' ? 'New' : 'Bestseller'` binary that silently rendered anything
  else as "Bestseller". **`BADGES`'s key list must stay character-identical
  to `intake-station`'s `lib/badges.ts`** — confirmed both currently list the
  same six keys. **Known loose end, not resolved by this commit:** the
  `/nazaakat-catalog-entry` skill (lives outside this repo) still only knows
  `new`/`bestseller` and needs updating separately to match.
- Added `nz-000002`, a second "Mint Kundan Chandbali" with photos (`dd2688c`).
- Added `prepare-batch.mjs` and organised export records under `exports/`
  (`9efd4e5`) — the batch-photo pipeline described in the file map below.
- Added `nz-000001`, the first product using the `nz-000001` ID format and
  the `prepare-batch.mjs`/`fetch-images.mjs` photo pipeline (`169a670`).
- Updated the western-line counter hero image (`f3404d8`).
- Added `nz-307`, Multi-Tone Ribbed Bangle Stack (`2e41f8d`).
- Fixed `nz-108`'s `price`/`mrp` to be numbers instead of strings
  (`d43b7c8`) — a reminder that nothing in `products.js` enforces field
  types; a hand-edited entry can silently break price sorting/formatting.
- Added `nz-108`, White Meenakari Cutwork Bangles (`20e941f`).
- Moved the catalogue out of `index.html` into standalone `products.js`
  (`b59d4d7`) — `index.html` loads it via `<script src="products.js">`
  placed before the main `<script>` block, so `PRODUCTS` is a global by the
  time the app code runs.
- Earlier history: initial site, first few hand-written products, mobile
  gallery-thumbnail misalignment fixes, and disabling the palette switcher
  (default-locked to the Midnight & Champagne / `sapphire` theme).

## Key decisions and why

- **WhatsApp enquiry only; the cart is built and dormant.**
  `FEATURES = { cart:false, payments:false }` in `index.html`'s SHOP CONFIG.
  Confirmed by reading every call site: the cart button, bag panel, sticky
  add-to-bag, order-message wiring and the "Pay now" swap all gate on
  `FEATURES.cart`/`FEATURES.payments` (11 call sites total) — flipping
  either flag is a one-line change with no other edit required. This was a
  deliberate deferral until catalogue size or order volume demands it, not a
  missing feature.
- **No build step, no framework, no runtime dependencies.** Confirmed — no
  `package.json` anywhere in the tree. `fetch-images.mjs` and
  `prepare-batch.mjs` are standalone Node scripts run manually from the
  shell for the photo-intake workflow; they don't touch the site itself.
- **`:root` CSS and `THEMES.sapphire.vars` are duplicated on purpose and
  must be edited together.** So first paint isn't the wrong colour before JS
  runs. Confirmed currently identical — all 12 colour variables match
  exactly between the two.
- **Two live ID formats, both work.** Legacy hand-written `nz-1xx` (ethnic),
  `nz-2xx` (ad), `nz-3xx` (western) — 21 products — coexist with the current
  `nz-000001`-style format used by `prepare-batch.mjs` — 2 products
  (`nz-000001`, `nz-000002`). Both work because product IDs are opaque
  strings nothing parses. Whether to backfill the legacy IDs is still an
  open question, not a bug.
- **Palette switcher is commented out, not deleted.** Confirmed all three
  locations are intact with restore instructions: the `<div class="devbar">`
  in the body (with a comment above it explaining what to uncomment), the
  `renderDevbar()` call in `router()`, and the `#/palettes` route branch in
  `router()`. Default and only live theme is Midnight & Champagne
  (`sapphire`).

## File map (for quick orientation)

```
index.html          1202 lines — markup, CSS and app JS. Internal numbered
                     comment banners (1. SHOP CONFIG through 9. router) mark
                     section boundaries; SHOP CONFIG is the "edit here,
                     nothing else" zone for FEATURES/BRAND/LINES/TYPES/
                     OCCASIONS/BANDS/BADGES.
products.js          the catalogue — a single `const PRODUCTS = [...]`,
                     loaded via <script src="products.js"> before the main
                     <script> block in index.html.
fetch-images.mjs     joins an intake-station export (SKU -> blob URLs) with
                     finished catalog entries (id -> gallery paths) and
                     downloads each blob URL to its matching gallery path,
                     so images land in the repo already named the way the
                     catalog expects.
prepare-batch.mjs    downloads every photo from an intake-station export
                     into ./batch/ (gitignored), named `<id>-01.jpg` etc. so
                     order survives being attached to a chat in any order.
images/              committed product photos plus the three
                     counter-{ethnic,ad,western}.jpg hero tiles;
                     images/README.txt has the naming convention.
exports/             paper trail from the photo-intake pipeline: the raw
                     intake-station export JSON plus matching
                     `<id>-entries.json` catalog-object files, one pair per
                     batch — this is the "entries.json" fetch-images.mjs
                     expects as its second argument.
batch/               gitignored scratch output of prepare-batch.mjs.
.gitignore           just `batch/`.
```

No `README.md`, no `package.json`.

## Open items — not yet built

- **The golden line.** A fourth `LINES` entry for gold-polish, non-stone
  jewellery (plain gold-tone pieces, sometimes with meenakari colour work,
  no stones) — doesn't fit `ethnic` (defined by stone work) or `western`.
  Touches `LINES`, a new `--velvet-golden` CSS var in `:root` **and** all
  three `THEMES[*].vars` objects, `images/counter-golden.jpg`, the
  hardcoded 3-column tray grid (`repeat(3,1fr)`), the hardcoded per-line
  counter numbering and `counterImages` lookup in `homePage()`, and several
  "three counters" / "three lines" strings scattered through copy (hero,
  About page, footer, header nav). Raised, not implemented.
- **Showing one product under more than one line/type.** `occ` is already
  an array and filters with `.some()`; `line`/`type` are single strings
  because the velvet-colour-per-line design needs one canonical line per
  card. Proposed approach: optional `alsoLines`/`alsoTypes` arrays per
  product plus `linesOf()`/`typesOf()` helpers that fold them in at filter
  time, with a guardrail of one primary line plus at most one secondary.
  Discussed, not implemented.
- **Taxonomy expansion.** A competitor research pass (Bling Bag, Kushal's,
  Priyaasi, Aachho, Shaya, Tarinika, Voylla) found the biggest gap is
  missing *facets* — no colour filter, no material/finish filter — not
  missing product types, though ~12 commonly-searched types are also absent
  (mangalsutra, choker, rani haar, nose ring/nath, matha patti, etc.).
  Recommends ~6 style-based lines instead of ethnic/ad/western, earring
  sub-types as a secondary filter rather than top-level types, and a
  governance rule of only surfacing a filter once it holds ≥3 live products.
  The "add more badges" part of this research (few-left, back-in-stock,
  customer-favourite, handcrafted) has already landed in code as `BADGES`
  (see Changes above) — the rest is researched, not implemented.
- **`nz-000001` and `nz-000002` share a name** ("Mint Kundan Chandbali")
  and near-identical `stones`/`size` text — different price, weight and
  photos, so presumably genuinely different pieces, but they'll read as
  duplicates in a grid. Need distinguishing names.
- **`nazaakatjewels.in`'s redirect** needs confirming in the Vercel
  dashboard — not visible from this repo (see Current state above).
- Google Business Profile listing name reads "Nazaakat" only; adding
  "Naveen Jewellers" would help local search match the site.
- Trademark for "Nazaakat" has never been searched (Class 14/35, free
  search at ipindiaonline.gov.in/tmrpublicsearch). Not urgent, not blocking.
- The homepage About/story section still uses generated placeholder art
  captioned "Replace with the storefront photo" — a real photo is pending.

## If you're a new Claude chat reading this

You have full context now. Ask what the person wants to build next rather
than re-deriving the architecture — it's already settled per the decisions
above, and changing course on the no-build/no-framework/WhatsApp-only
decisions without a stated reason would undo choices made deliberately for
this specific small-shop, low-traffic use case.
