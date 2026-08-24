# Nazaakat — Taxonomy Specification

Status: **finalized, not yet implemented**
Date: 23 August 2026
Scope: §7 of the project handoff (7a golden line, 7b multi-category, 7c taxonomy expansion)

This is the single source of truth for the catalogue's vocabulary. It is shared by
two repos that must not drift:

- `nazaakat-website` — renders the facets and filters against them
- `intake-station` — captures the subset of them that is knowable at intake

The `/nazaakat-catalog-entry` skill also consumes it and must be updated from this
document, not from either repo's code.

---

## 0. Governing principles

**Full vocabulary ships in code from day one.** Every key below exists whether or
not a single product carries it. Nothing here waits on stock.

**`min` controls rendering, not existence.** A facet value renders as a filter chip
only once at least `min` live products carry it. Below that it's invisible but
live — the day a third oxidised jhumka is added, "Oxidised" appears in the Style
group by itself. This is what makes a 70-value vocabulary usable against a small
catalogue.

Three rules the counting must follow:

1. Count against **all** products, never the currently-filtered list — otherwise
   options vanish as the shopper clicks, which reads as a bug.
2. **Always render a value that is currently active in `filterState`**, regardless
   of count. Otherwise a deep link like `#/shop?type=kada` produces a live filter
   with no visible way to clear it.
3. Hide a whole facet group when no values survive its threshold. An empty
   "Colour" heading is worse than no heading.

**One canonical value per display dimension.** `line` and `type` are single-valued
for display (velvet colour, breadcrumb, card label) with optional secondary tags
for filtering. Everything else is a plain array.

---

## 1. LINES — 6

The merchandising counter. Each owns a velvet tone, a hero tray, a counter number,
a blurb, a drawer entry and a footer entry. **This is the only facet with a visual
design signature**, which is why it stays small and single-valued.

| key | label (short) | full | blurb |
|---|---|---|---|
| `kundan` | Traditional | Traditional & Kundan | Kundan, polki and jadau — the sets that come out for weddings and stay in the family. |
| `temple` | Temple & Golden | Temple & Golden | Temple motifs and plain gold-polish pieces. Antique or high-shine, no stones needed. |
| `ad` | American Diamond | American Diamond | CZ set the way a diamond set would be — rhodium and gold tone, for receptions and cocktail evenings. |
| `oxidised` | Oxidised | Oxidised | Blackened silver-tone with tribal and boho form. Cotton, linen, and everything a kurta goes with. |
| `pearl` | Pearl | Pearl | Shell and freshwater-look pearls, strung and set. The quietest counter in the shop. |
| `western` | Western | Western & Minimal | Hoops, bar pendants, stacking pieces. Quiet enough for the office, sharp enough for dinner. |

Order above is display order everywhere `Object.entries(LINES)` is used.

### Velvet tones

One per line **per theme**, plus a copy of the sapphire set in `:root` (the two are
duplicated on purpose so first paint isn't wrong before JS runs — they must match
exactly). Chosen to stay distinguishable at tray size and to flatter each line's
dominant metal.

| line | sapphire (live) | wine | emerald |
|---|---|---|---|
| `kundan` | `#3A1330` | `#5A1024` | `#123D2E` |
| `temple` | `#3E2814` | `#4A2F12` | `#3C2E13` |
| `ad` | `#102244` | `#152647` | `#10334A` |
| `oxidised` | `#1E2B27` | `#24322C` | `#1C2E26` |
| `pearl` | `#3B3430` | `#453A33` | `#37372E` |
| `western` | `#28313C` | `#2C3A38` | `#2E3B31` |

CSS var name `--velvet-{key}`, class `.v-{key}`, and `LINES[k].velvet` = `"v-{key}"`.

### Counter photos

Path convention `images/counter-{key}.jpg`, derived — never a lookup object.

Three already exist and map cleanly: `counter-ethnic.jpg` → rename to
`counter-kundan.jpg`, `counter-ad.jpg` and `counter-western.jpg` keep their names.
`temple`, `oxidised` and `pearl` have no photo yet.

**Do not add a placeholder image file.** Put an `onerror` handler on the tray image
that removes the `<img>` and falls back to the line's velvet colour — the same
"never looks broken" principle the site already applies to product photos. Drop a
real `.jpg` in later and it appears with zero code change.

### Tray grid

Replace the hardcoded column counts with `repeat(auto-fit, minmax(260px, 1fr))`.
Handles three lines or seven without another breakpoint edit.

---

## 2. TYPES — 15

Top-level product type. Single-valued (`type`) with optional `alsoTypes`.

Ordered head-to-toe, which is also sidebar display order.

| key | label |
|---|---|
| `necklace-set` | Necklace sets |
| `necklace` | Necklaces |
| `mangalsutra` | Mangalsutra |
| `earrings` | Earrings |
| `bangles` | Bangles |
| `kada` | Kadas |
| `bracelets` | Bracelets |
| `rings` | Rings |
| `haath-phool` | Haath phool |
| `armlet` | Armlets / bajuband |
| `maang-tikka` | Maang tikka |
| `matha-patti` | Matha patti |
| `nose-ring` | Nose rings & nath |
| `kamarbandh` | Kamarbandh |
| `brooch` | Brooches & saree pins |

**Deliberately not types:** choker, rani haar, long necklace and pendant set. These
are to `necklace` what jhumka is to `earrings` — see SUBTYPES. Promoting them would
balloon the type list while splitting the same shopper's intent across two levels.

**Held back until stocked:** `passa` (jhoomar), `hair-accessory`, `anklets` and
`toe-rings`. These are the one category of exception to the "full vocabulary ships
regardless of stock" rule in §0 — not because they're unlikely, but because the
`min` threshold only hides a chip, whereas a type key also has to be a valid value
in `intake-station`'s dropdown and in the catalog-entry skill. Adding a type is a
three-repo edit, so unstocked ones are held rather than shipped dark. Note that
`anklets` was a live type in the previous eight-value list and is being **removed**.

### `art()` placeholder aliases

`art()` has line drawings for eight shapes and falls through to an empty velvet
rectangle otherwise. Seven of the fifteen types resolve directly; the other eight
need an alias:

```
kada          → bangles        haath-phool   → bracelets
armlet        → bangles        nose-ring     → rings
mangalsutra   → necklace       kamarbandh    → anklets
matha-patti   → maang-tikka    brooch        → maang-tikka
```

Note that `anklets` here is a **drawing name, not a type** — it is retained purely
as the alias target for `kamarbandh`. Do not delete the anklets drawing when
removing the anklets type, and do not reintroduce it as a type.

Plus a generic fallback drawing for any unmapped future type, so a new type can
never render as a blank rectangle.

---

## 3. SUBTYPES — 17, scoped to parent type

A secondary filter that appears **only when a type is selected**, keyed by which
parent types it applies to. Array field (`subtypes`) — a piece can be both a
chandbali and a drop.

| key | label | applies to |
|---|---|---|
| `jhumka` | Jhumka | earrings |
| `chandbali` | Chandbali | earrings |
| `studs` | Studs & tops | earrings |
| `hoops` | Hoops & bali | earrings |
| `drops` | Drops & danglers | earrings |
| `sui-dhaga` | Sui dhaga | earrings |
| `ear-cuff` | Ear cuffs | earrings |
| `sahara` | Kaan chain / sahara | earrings |
| `choker` | Choker | necklace, necklace-set |
| `rani-haar` | Rani haar / long | necklace, necklace-set |
| `pendant-set` | Pendant set | necklace, necklace-set |
| `collar` | Collar | necklace, necklace-set |
| `layered` | Layered & multi-strand | necklace, necklace-set |
| `cocktail` | Cocktail | rings |
| `adjustable` | Adjustable | rings |
| `stackable` | Stackable | rings, bangles |
| `openable` | Openable / hinged | bangles, kada, bracelets |

Sidebar behaviour: the Detail group renders only when `filterState.type` is
non-empty, and offers only subtypes whose `of` array intersects the selected
types. `min: 1` here rather than 3 — the shopper has already narrowed to a type,
so precision matters more than volume.

---

## 4. STYLES — 12

Craft and technique. Array field (`styles`). Cuts across lines: meenakari appears
in Traditional, Temple & Golden and occasionally Western.

Overlap with `line` is intentional and hierarchical — the Traditional counter
*contains* kundan, polki and jadau work — not redundant.

| key | label |
|---|---|
| `kundan` | Kundan |
| `polki` | Polki |
| `jadau` | Jadau |
| `meenakari` | Meenakari |
| `temple-work` | Temple work |
| `filigree` | Filigree |
| `cutwork` | Cutwork |
| `mirror-work` | Mirror work |
| `navratna` | Navratna |
| `beadwork` | Beadwork |
| `thread-lac` | Thread & lac |
| `stone-free` | Plain / stone-free |

---

## 5. COLOURS — 12

**The highest-value filter in this market** — women shop to match one specific
saree or lehenga. Array field (`colours`); a piece is typically its metal tone plus
its dominant stone colour.

Includes metal tones, deliberately — "gold" and "silver" are how shoppers describe
a piece with no stones.

| key | label | swatch hex |
|---|---|---|
| `gold` | Gold | `#C9A227` |
| `silver` | Silver & rhodium | `#C6C8CA` |
| `rose-gold` | Rose gold | `#C98F7E` |
| `black` | Black & gunmetal | `#2B2B2E` |
| `white` | White & clear | `#F2F0EA` |
| `red` | Red & maroon | `#9B1B30` |
| `pink` | Pink & rose | `#D4718F` |
| `peach` | Peach & champagne | `#E3B899` |
| `green` | Green & emerald | `#1F6B4E` |
| `blue` | Blue & navy | `#1E3E78` |
| `purple` | Purple & wine | `#5B2A5E` |
| `multi` | Multicolour | *gradient* |

Swatch hexes are for the sidebar dot only, applied as an inline `style` from a JS
map. **They are not CSS custom properties** and must not be added to `:root` or the
`THEMES` objects — they're product descriptions, not theme tokens, and they stay
constant across all three palettes. `multi` renders a small conic-gradient dot.

---

## 6. FINISHES — 5

Surface treatment. Array field (`finishes`) — a two-tone piece can be matte on one
tone and high-shine on the other.

| key | label |
|---|---|
| `high-shine` | High shine |
| `matte` | Matte |
| `antique` | Antique |
| `brushed` | Brushed & textured |
| `two-tone` | Two-tone & multi-tone |

Distinct from the `oxidised` line and the `stone-free` style: finish is *how the
surface is treated*, not what the piece is made of or what counter it sits on.

---

## 7. OCCASIONS — 9

Existing array field (`occ`), widened from 5. Purely additive.

| key | label |
|---|---|
| `everyday` | Everyday |
| `office` | Office |
| `festive` | Festive |
| `party` | Party & cocktail |
| `bridal` | Bridal |
| `wedding-guest` | Wedding guest |
| `haldi-mehendi` | Haldi & mehendi |
| `sangeet` | Sangeet & reception |
| `gifting` | Gifting |

Named festivals (Navratri, Karva Chauth, Diwali, Rakhi) are **not** occasions —
they're time-boxed merchandising and belong to collections, deferred. Putting them
here would leave a dead "Karva Chauth" chip up for eleven months of the year.

---

## 8. PRICE BANDS — 5

Widened from 4 to give the upper range somewhere to sit.

| id | label | min | max |
|---|---|---|---|
| `b1` | Under ₹500 | 0 | 499 |
| `b2` | ₹500 – ₹1,000 | 500 | 1000 |
| `b3` | ₹1,000 – ₹2,000 | 1000 | 2000 |
| `b4` | ₹2,000 – ₹3,500 | 2000 | 3500 |
| `b5` | ₹3,500 & above | 3500 | 1e9 |

Computed from `price`, never stored on the product.

---

## 9. BADGES — 6

Single-valued, `""` (no badge) always valid, at most one per piece.

| key | label | tone |
|---|---|---|
| `bestseller` | Bestseller | quiet |
| `new` | New | gold |
| `few-left` | Few left | strong |
| `back-in-stock` | Back in stock | gold |
| `customer-favourite` | Customer favourite | quiet |
| `handcrafted` | Handcrafted | quiet |

Only literal `new` counts as new for the homepage "New this month" rail and the
"Newest first" sort — a `back-in-stock` piece is not new.

---

## 10. The facet engine

The deliverable is the engine, not the vocabulary. `filterState` becomes derived
rather than a fixed-shape literal, and sidebar, `renderResults()`, `syncBoxes()`
and the chip row all become loops over one array.

```js
const FACETS = [
  {key:"line",    label:"Line",     values:()=>LINES,     match:(p,v)=>linesOf(p).includes(v),        min:0},
  {key:"type",    label:"Type",     values:()=>TYPES,     match:(p,v)=>typesOf(p).includes(v),        min:3},
  {key:"subtype", label:"Detail",   values:()=>subtypesFor(filterState.type),
                                    match:(p,v)=>(p.subtypes||[]).includes(v),  min:1,
                                    when:()=>filterState.type.length > 0},
  {key:"style",   label:"Style",    values:()=>STYLES,    match:(p,v)=>(p.styles  ||[]).includes(v),  min:3},
  {key:"colour",  label:"Colour",   values:()=>COLOURS,   match:(p,v)=>(p.colours ||[]).includes(v),  min:3, swatch:true},
  {key:"finish",  label:"Finish",   values:()=>FINISHES,  match:(p,v)=>(p.finishes||[]).includes(v),  min:3},
  {key:"occ",     label:"Occasion", values:()=>OCCASIONS, match:(p,v)=>(p.occ     ||[]).includes(v),  min:2},
  {key:"band",    label:"Price",    values:()=>bandMap(), match:(p,v)=>inBand(p,v),                   min:0}
];
```

`filterState` = `{...Object.fromEntries(FACETS.map(f=>[f.key,[]])), sort:"featured"}`.

Adding a facet later is one array entry plus one vocabulary object. Nothing else.

`min:0` on `line` means all six counters always render, including empty ones —
that is a deliberate choice to establish the six-counter structure ahead of stock.
Changing it to `min:1` hides empty counters and is a one-character edit.

### Multi-category (§7b)

```js
const linesOf = p => [p.line, ...(p.alsoLines || [])];
const typesOf = p => [p.type,  ...(p.alsoTypes  || [])];
```

Display sites — `card()`, `piecePage()` eyebrow and breadcrumb, cart meta line —
keep reading `p.line` / `p.type` directly. Primary always wins for display; the
velvet-per-line signature requires exactly one canonical line per piece.

**Guardrail:** at most one secondary line and one secondary type. A `console.warn`
at load flags violations, plus any `alsoLines`/`alsoTypes` that redundantly repeats
the primary. Never an `alert` — nothing a shopper can see.

---

## 11. Product schema (final)

```js
{
  id:        "nz-000001",
  name:      "Mint Kundan Chandbali",
  line:      "kundan",              // one of LINES — required
  alsoLines: ["temple"],            // optional, max 1
  type:      "earrings",            // one of TYPES — required
  alsoTypes: [],                    // optional, max 1
  subtypes:  ["chandbali"],         // array, scoped to type
  styles:    ["kundan","meenakari"],// array
  colours:   ["gold","green"],      // array
  finishes:  ["high-shine"],        // array
  occ:       ["festive","party"],   // array
  price:     1500,
  mrp:       1800,                  // 0 = no strikethrough
  badge:     "new",                 // one of BADGES, or ""
  stones:    "...",                 // free text
  plating:   "...",                 // free text
  incl:      "...",                 // free text
  size:      "...",                 // free text, may be null
  weight:    "20 g",
  gallery:   ["images/nz-000001-1.jpg", ...]   // or img:"..." for one photo
}
```

All four new array fields default to `[]` when absent. No product is invalid for
omitting them — it simply won't match those filters.

---

## 12. Split of responsibility across the two repos

| facet | captured where | why |
|---|---|---|
| `type`, `subtypes` | intake-station | Unambiguous from the physical piece |
| `colours` | intake-station | The operator sees the true colour; a camera does not |
| `finishes` | intake-station | Matte vs high-shine is tactile, not always photographic |
| `size`, `weight`, `price`, `mrp`, `badge` | intake-station | Already captured |
| `line`, `alsoLines` | catalog-entry skill | Stylistic judgment from the finished photo |
| `styles`, `occ` | catalog-entry skill | Inferred from the photo and the piece's character |
| `stones`, `plating`, `incl`, `name` | catalog-entry skill | Already the skill's job |

`intake-station` gains three new array columns (`subtypes`, `colours`, `finishes`),
the revised 15-value type list, and the scoped subtype widget. It gains **no**
`line` column — classification stays downstream, where the photo is.

---

## 13. Explicitly deferred

- **Collections** (festival edits, gifting, "under ₹500"). Tag-based ones go stale
  and need seasonal curation; predicate-based ones should be computed, never
  hand-tagged. Once this engine exists a collection is a saved `filterState` plus a
  title, so deferring costs little.
- **Colour swatch UI beyond a dot.** Plain checkbox plus inline-styled dot for now.
- **Line re-cut migration.** Not applicable — the current 23 products are test data
  and are being removed.

---

## 14. Header nav consequence

Six lines plus Care & FAQ, Our story and Visit is nine top-level items; the
masthead flex row breaks around 900px. `header()`'s `nav` array becomes a single
**Shop** entry pointing at `#/shop`, followed by the three existing content links.

Lines remain reachable from the hero trays, the mobile drawer's "Shop by line"
block, the footer Shop column, and the sidebar Line facet — all six, all derived
from `LINES`.
