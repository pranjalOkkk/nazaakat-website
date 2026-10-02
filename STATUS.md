# Status

Last updated: 24 Aug 2026

This file exists so a new chat, or a future you, can pick this project back up
without re-deriving the reasoning behind it or re-pasting a handoff doc.
Contact details, address, hours and palette hex values already live in code
(`BRAND` and `THEMES` in `index.html`) and aren't repeated here — this covers
**where things stand right now** and **why they're built the way they are**.

---

## Current state

- Static, no-build site: `index.html` (~1400 lines — markup, CSS and app JS in
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
- No `README.md`. The site itself (`index.html`) remains a plain static file
  with no build step and no runtime dependencies — `fetch-images.mjs` and
  `prepare-batch.mjs` are still run ad hoc with plain `node`, no install
  needed. A `package.json` now exists, but scoped to dev/QA tooling only
  (currently just `playwright`, for `check-wrap-padding.mjs` — see Changes);
  `node_modules/` is gitignored and nothing under it is required to serve
  or edit the site.

## Changes

Most recent first.

- **Added `check-facet-engine.mjs` — the permanent facet-engine check.**
  **No such committed check existed before this**, even though many earlier
  prompts and STATUS lines referred to "the existing facet-engine suite" as
  if it did: each past session wrote a throwaway vm/jsdom script, ran it
  once and discarded it (not in this repo, its git history, or
  `../intake-station`). So "0 failures" in earlier entries was real but a
  one-off, not a rerun of a stable suite — and that's why this file is new
  even though the facet engine itself is older. Plain Node + `vm` with a stub
  DOM (no Playwright, no install step), ~0.15s, 165 assertions: empty- and
  real-catalogue rendering with no undefined/null/NaN/[object Object];
  six-line structure and per-line velvet; a throwaway 7th line propagating to
  trays/drawer/footer/sidebar; governance thresholds, deep-linked
  sub-threshold chips and full-catalogue counting; subtype scoping and
  orphan pruning; multi-category matching/display and the load-time
  `console.warn` guardrail; art() coverage for all 15 types plus the generic
  fallback; no hardcoded facet keys in the facet-loop functions, plus a
  throwaway 10th facet working from one `FACETS` entry; colour swatches
  (hex dot vs `multi` conic-gradient). Passes against the current
  `index.html` (post-masthead change) and was confirmed to fail under
  deliberate mutations. Deliberate exception: `liveTypeEntries()` (homepage pills and
  drawer "Shop by type") looks up the `"type"` facet by key literal on
  purpose — a type-specific browsing feature, not a generic facet-engine
  function — and carries a comment saying so; it isn't asserted facet-driven.

- **Masthead height cut ~40%, with a 44px burger tap target kept**.
  Measured in real Chromium first: 67px mobile / 85px desktop (incl. the
  1px border-bottom). Now 43px mobile / 51px desktop (64% / 60%). Desktop:
  `.mast-in` 84→50px and the Enquire button's padding/min-height shrunk
  (`.mast-cta{padding:8px 22px;min-height:36px}`); type unchanged. Mobile:
  `.mast-in` 66→42px, wordmark scaled together (`.small` 9→8px, `.big`
  23→20px, gap 4→3px; 8px is the legibility floor). The burger is 44px tall
  (it briefly went to 36px, below a comfortable touch size) and overhangs
  the 42px bar by 1px top/bottom via `margin:-1px`, so the glyph stays small
  and the bar stays thin; mobile ended 3px taller than the exact 40px/60%
  target to protect that. Dependent values moved with it: `#app{padding-top}`
  67→43px (mobile) / 85→51px (desktop), and `TOP_ZONE` 80→51 (one value for
  both breakpoints; on mobile it sits 8px below the bar's height, harmless).
  Verified: first content sits exactly at the masthead's bottom edge on all 7
  routes at 390 and 1280px; hide-on-scroll behaves; `check-wrap-padding.mjs`
  passes 180/180.

- **Fixed broken `position:sticky` on both the masthead and the mobile PDP
  buy bar; added hide-on-scroll to the masthead** (commits `4bbbeb4`,
  `66777b9`). Both elements' `position:sticky` was silently non-functional
  — confirmed in real Chromium, not assumed: `getComputedStyle` correctly
  reported `"sticky"`, but `getBoundingClientRect()` moved in exact
  lockstep with scroll instead of staying pinned, on both the header (top)
  and the buy bar (bottom). Root cause: `overflow-x:hidden` on both
  `<html>` and `<body>` (there to stop horizontal scroll/bounce) silently
  changes what scroll container a `position:sticky` descendant sticks
  relative to in Chromium and breaks it — no console warning, no dropped
  CSS declaration to find by reading the stylesheet. Rebuilt both on
  `position:fixed`, which has no such ancestor-overflow failure mode:
  - `.masthead` → `position:fixed;top:0`, same `z-index`/background/
    border. Fixed removes it from document flow (sticky still reserves
    its own space even when not "stuck"), so `#app{padding-top}`
    compensates — sized to the header's *actual* rendered height
    including its own 1px `border-bottom` (67px mobile, 85px desktop),
    not just `.mast-in`'s 66px/84px content height, which left a 1px
    overlap when first tried and measured with the browser rather than
    assumed. Added the hide-on-scroll-down/show-on-scroll-up behavior on
    this now-solid foundation (`.mast-hide{transform:translateY(-100%)}`,
    a passive rAF-throttled scroll listener with an 80px top zone and
    asymmetric down/up thresholds). The listener queries `.masthead`
    fresh on every scroll rather than caching a reference, because
    `router()` replaces `#app`'s entire `innerHTML` — and so the header
    DOM node — on every navigation; a freshly-rendered header never
    carries `mast-hide`, so route changes reset visibility for free with
    no extra code.
  - `.sticky-buy` (the mobile product-page buy bar) → same fix, confirmed
    independently rather than assumed just because the mechanism matched.
    Its actual rendered height (69.8px, stable across every mobile width
    and product tested, rounded up to 70px) is different from the
    masthead's and was measured fresh rather than reused. `.pdp-page
    footer{padding-bottom:70px}` compensates, reusing the `.pdp-page`
    body class `router()` already sets (and `.wa-float`'s existing PDP
    offset already consumes) rather than touching `footer()` on every
    route; reset to 0 at the `>=900px` breakpoint where the bar itself
    goes `display:none`.
  - Verified in headless Chromium on both: fixed positioning holds at
    every tested scroll depth; no route's content renders underneath the
    header on load; the buy bar never overlaps the footer even scrolled
    to the very end of the page; non-PDP routes and the desktop
    breakpoint are unaffected; the mobile drawer opens above the header
    with no z-index conflicts; the masthead's hide/show doesn't perturb
    the page's total scroll height or the buy bar's independent pinning.
  - `check-wrap-padding.mjs` re-runs clean against the final state — this
    work didn't touch it. (This line used to also claim "the facet-engine
    suite" re-ran clean. **No such file exists in this repo or its git
    history, or in `../intake-station`** — the facet-engine checks were
    ad-hoc vm/jsdom scripts run during the taxonomy work and never committed,
    so there is nothing to re-run by filename. The only committed standing
    check was `check-wrap-padding.mjs` — **resolved: `check-facet-engine.mjs`
    now exists, see the newest entry above.**)
- **`docs/nazaakat-taxonomy-spec.md` is now committed, not a temporary
  chat artifact** (commit `6fb6c8e`). Every prompt before this one treated
  the spec as something to read and delete; it's the shared source of
  truth across this repo, `intake-station`, and the
  `/nazaakat-catalog-entry` skill, and now has real version history.
- **Fixed a `.wrap` padding-clobbering cascade bug, predating the taxonomy
  work** (commit `43fa174`). `.wrap{padding:0 20px}` is the
  only source of side margins on any page where a section wraps `.wrap`
  directly rather than nesting it inside a separate outer element — and on
  every page except the homepage, a companion class (`sec`, `sec-tight`,
  `shop-top`, `shop-body`, `crumbs`) sat on the *same* element as `wrap`
  (e.g. `<div class="wrap shop-top">`) and used the `padding` **shorthand**
  with equal CSS specificity, declared later in the stylesheet — so it won
  the whole property and silently zeroed `.wrap`'s left/right, leaving
  `#/shop`, `#/piece/:id`, `#/about`, `#/care` and `#/visit` flush to the
  screen edge with no gutter. Confirmed via git diff that the exact CSS and
  markup responsible is byte-identical across the initial commit
  (`a1dc07a`), the pre-taxonomy commit (`98547ce`), and the commit right
  before this fix — this bug shipped on day one, not something the six-line
  re-cut or facet engine introduced. Fixed by converting those five rules
  from the shorthand to `padding-top`/`padding-bottom` longhand (matching
  the pattern `.pdp` already used correctly, since it only ever set
  `padding-bottom`). A follow-up audit confirmed no other `wrap`-combined
  element in the file was at risk (`mast-in`, `hero-in`, `split`, `story`
  declare no `padding`/`margin` at all, so there's nothing for them to
  clobber). **Why this survived every prior check**: every test in this
  project (the vm/jsdom harnesses used throughout the taxonomy work) only
  confirms a class *name* is present in rendered HTML — none of them run
  real CSS cascade or layout, so none could see a later rule zero out an
  earlier one. Added `check-wrap-padding.mjs` (headless Chromium via
  Playwright, `npm install` once) as a **standing** check — not a one-off
  diagnostic — asserting every `.wrap` element holds 20px horizontal
  padding across all live routes at 390/768/900/1024/1280px; it's
  selector-agnostic (queries every `.wrap` element rather than a hardcoded
  list), so a future page combining `wrap` with a new companion class is
  covered automatically. Run it after any prompt that touches `<style>` or
  a page-render function, not only when a padding complaint resurfaces.
- **Six-line re-cut, multi-category display, and a config-driven facet
  engine — plus the full new-facet vocabulary** (commit `5599b58`, tray
  line-art follow-up `0360ad2`). `docs/nazaakat-taxonomy-spec.md` is now the single
  source of truth for all of this — shared with `intake-station` and the
  `/nazaakat-catalog-entry` skill, neither of which has been updated yet
  (see Open items). What changed:
  - **Lines**: retired the three-line `ethnic`/`ad`/`western` taxonomy for
    six — `kundan`, `temple`, `ad`, `oxidised`, `pearl`, `western` — each
    with its own velvet tone across `:root` and all three `THEMES`
    (confirmed byte-identical between `:root` and `THEMES.sapphire.vars`),
    hero tray, drawer entry and footer entry, all derived from `LINES` so a
    seventh line is a one-object edit (verified by temporarily adding one
    and confirming it propagated everywhere with no other change).
  - **Types**: widened from 9 to the spec's 15. `anklets` is **removed** as
    a type but survives as the name of `art()`'s alias-drawing target for
    `kamarbandh` — do not delete that drawing or re-add `anklets` to
    `TYPES`. Added a generic fallback drawing so no type (present or
    future) ever renders a blank velvet rectangle.
  - **New facets**: `SUBTYPES` (17, scoped to parent types via an `of`
    array, only shown once a type is selected), `STYLES` (12), `COLOURS`
    (12, with a separate `COLOUR_HEX` swatch map — deliberately not theme
    tokens, since a green stone is green in all three palettes), `FINISHES`
    (5). `OCCASIONS` widened 5→9, `BANDS` widened 4→5 (ids held stable, so
    an old `#/shop?band=b2` link still resolves the same band).
  - **The facet engine**: the sidebar, `renderResults()`, the chip row,
    `syncBoxes()` and `clearFilters()` no longer have per-facet code — they
    all loop over one `FACETS` array (8 entries: line/type/subtype/style/
    colour/finish/occ/band), each declaring its own `values()`, `match()`,
    `min` render threshold, and optional `when()` (Detail/subtype only
    shows once a type is picked) / `swatch` (Colour only) hooks. Confirmed
    `renderResults()`/`syncBoxes()`/`toggleFilter()`/the chip loop contain
    no hardcoded facet-key literals — adding a tenth throwaway facet during
    verification was picked up everywhere with a one-line array edit.
  - **Multi-category**: `linesOf()`/`typesOf()` plus optional `alsoLines`/
    `alsoTypes` product fields (max one secondary each; a `console.warn`
    -only load-time guardrail flags violations) let a piece match more than
    one line/type filter while still showing exactly one canonical
    line/type for display (velvet colour, breadcrumb, card label — the
    velvet signature needs exactly one).
  - `products.js`'s 23 products are untouched test data — still on the
    retired `ethnic` line key and the old 5-occasion shape, carrying none
    of the new `subtypes`/`styles`/`colours`/`finishes` fields. They still
    render correctly (safe fallbacks: `lineLabel()`/`typeLabel()`/`art()`'s
    velvet fallback), just don't populate any of the new filters.
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
- **No build step, no framework, no runtime dependencies — for the site.**
  `index.html` and `products.js` need nothing installed to serve or edit.
  `fetch-images.mjs` and `prepare-batch.mjs` are standalone Node scripts run
  manually from the shell for the photo-intake workflow; they don't touch
  the site itself. `package.json` exists only for dev/QA tooling
  (`check-wrap-padding.mjs`'s `playwright` dependency) and is never loaded
  by the site.
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
index.html          ~1460 lines — markup, CSS and app JS. Internal numbered
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
check-wrap-padding.mjs  headless-Chromium check that every `.wrap`-bearing
                     element holds its 20px horizontal padding, across all
                     live routes and five viewport widths (390–1280px).
                     `npm install` alone provisions it (playwright's
                     Chromium binary downloads via package.json's
                     `postinstall` hook — confirmed by testing that this is
                     needed: without it, `npm install` succeeds but the
                     script then fails until a separate `npx playwright
                     install chromium` is run). Not part of the site's
                     runtime. Run after any prompt that touches <style> or
                     a page-render function — see Changes for why a
                     vm/jsdom check can't catch this class of bug.
check-facet-engine.mjs  plain-Node (vm + stub DOM, no browser, no install step,
                     ~0.15s) structural check of the facet engine: FACETS
                     governance thresholds, six-line structure, subtype
                     scoping, multi-category matching, art() type coverage,
                     facet-driven (no hardcoded keys) render functions, colour
                     swatches. Loads index.html's inline script + products.js.
                     Run after any change to products.js, FACETS, the
                     vocabularies, art(), or a render function that consumes
                     them. Not a layout check — that's check-wrap-padding.mjs.
package.json         dev/QA tooling only (currently just `playwright`, for
                     check-wrap-padding.mjs, with a `postinstall` hook that
                     fetches its Chromium binary) — index.html loads
                     nothing from it and needs no install of its own.
docs/                docs/nazaakat-taxonomy-spec.md — the finalized line/
                     type/subtype/style/colour/finish/occasion/price-band
                     vocabulary, shared source of truth with
                     `intake-station` and the `/nazaakat-catalog-entry`
                     skill (neither has been updated to match yet).
images/              committed product photos plus the six
                     counter-{kundan,temple,ad,oxidised,pearl,western}.jpg
                     hero tiles (temple/oxidised/pearl not shot yet — the
                     tray falls back to line-art, see LINES in index.html);
                     images/README.txt has the naming convention.
exports/             paper trail from the photo-intake pipeline: the raw
                     intake-station export JSON plus matching
                     `<id>-entries.json` catalog-object files, one pair per
                     batch — this is the "entries.json" fetch-images.mjs
                     expects as its second argument.
batch/               gitignored scratch output of prepare-batch.mjs.
.gitignore           `batch/` and `node_modules/`.
```

No `README.md`.

## Open items — not yet built

- **`intake-station` needs the same vocabulary.** It must gain the revised
  15-value type list, the scoped subtype widget, and three new array
  columns (`subtypes`, `colours`, `finishes`) — `docs/nazaakat-taxonomy-spec.md`
  §12 has the full capture-responsibility split. It does **not** need a
  `line` column; line classification stays downstream, in the
  catalog-entry skill, where the finished photo is.
- **The `/nazaakat-catalog-entry` skill still knows none of this taxonomy**
  and will not populate `line`, `alsoLines`, `styles`, `colours`,
  `finishes` or `subtypes` from a photo batch until it is updated
  separately from `docs/nazaakat-taxonomy-spec.md` — same loose end as the
  `BADGES` vocabulary noted below, now larger in scope.
- **Collections are deliberately deferred** (spec §13) — festival edits,
  gifting, "under ₹500" and similar. Tag-based collections go stale and
  need seasonal curation; predicate-based ones should be computed, not
  hand-tagged. Now that the facet engine exists, a collection is just a
  saved `filterState` plus a title, so deferring costs little.
- **`products.js` needs a real re-catalogue**, not just a line-key
  backfill — the 23 test products predate every facet in this pass
  (`subtypes`/`styles`/`colours`/`finishes`) and 21 of them predate
  `alsoLines`/`alsoTypes` too. Not started.
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
