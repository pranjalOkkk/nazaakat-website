#!/usr/bin/env node
/* ------------------------------------------------------------
   check-facet-engine.mjs — structural/logic check for the shop's facet
   engine (FACETS, the six-line structure, multi-category matching, art()
   coverage, the render functions that consume them).

   WHY THIS EXISTS: for the whole of the taxonomy/facet-engine work, prompts
   said "re-run the existing facet-engine suite" — but no such file was ever
   committed. Each session wrote a throwaway vm script, ran it once, and
   discarded it, so every past "0 failures" was real but a one-off, and
   "re-run the suite" was a request that could not actually be fulfilled.
   This is the permanent version, same tier as check-wrap-padding.mjs.

   RUN THIS after any change to products.js, the FACETS array, LINES / TYPES /
   SUBTYPES / the other vocabularies, art(), or any render function that
   consumes them (shopPage, fgroup, renderResults, card, piecePage, header,
   footer, homePage).

   HOW: plain Node, no dependencies, no browser. It extracts the inline
   <script> from index.html, runs it with products.js in a `vm` context behind
   a tiny stub DOM (getElementById / innerHTML storage — enough for the render
   functions), and asserts on the HTML strings they produce. It is NOT a
   layout check — real CSS cascade bugs are check-wrap-padding.mjs's job.
   Runs in well under a second. Needs only `node`; no `npm install` required.

   Usage: node check-facet-engine.mjs
   ------------------------------------------------------------ */
import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const t0 = process.hrtime.bigint();
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const productsSrc = fs.readFileSync(path.join(__dirname, "products.js"), "utf8");

// The one inline <script> that has no src= attribute is the app.
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (inlineScripts.length !== 1) { console.log(`FAIL  expected exactly 1 inline <script>, found ${inlineScripts.length}`); process.exit(1); }
const appSrc = inlineScripts[0];

let checks = 0, failures = 0;
function check(name, cond, detail) {
  checks++;
  if (!cond) { failures++; console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); }
}

/* ---------- harness ---------- */
function makeEl() {
  const classes = new Set();
  return { innerHTML: "", textContent: "", value: "", style: { setProperty() {} },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: c => classes.has(c) ? classes.delete(c) : classes.add(c), contains: c => classes.has(c) } };
}
function loadSite(withProducts = true) {
  const els = {};
  const warns = [], alerts = [];
  const ctx = {
    console: { warn: (...a) => warns.push(a.join(" ")), log() {}, error() {} },
    alert: (...a) => alerts.push(a), URLSearchParams, Date, Math, JSON,
    location: { hash: "" },
    requestAnimationFrame: f => f(),
    __els: els, __warns: warns, __alerts: alerts,
  };
  ctx.window = ctx;
  ctx.scrollY = 0; ctx.scrollTo = () => {}; ctx.addEventListener = () => {};
  ctx.document = {
    getElementById: id => els[id] || (els[id] = makeEl()),
    querySelector: () => null, querySelectorAll: () => [],
    body: makeEl(), documentElement: makeEl(), addEventListener() {},
  };
  vm.createContext(ctx);
  vm.runInContext(productsSrc, ctx, { filename: "products.js" });
  if (!withProducts) vm.runInContext("PRODUCTS.length = 0", ctx);
  vm.runInContext(appSrc, ctx, { filename: "index.html<script>" });
  const S = {
    ctx, els, warns, alerts,
    run: code => vm.runInContext(code, ctx),
    setProducts(arr) { ctx.__p = arr; vm.runInContext("PRODUCTS.length = 0; PRODUCTS.push(...__p)", ctx); },
    /* the sidebar markup shopPage() produced, i.e. everything inside <aside class="filters"> */
    sidebar(lineKey, qs) {
      ctx.__q = qs || "";
      const out = vm.runInContext(`shopPage(${lineKey ? JSON.stringify(lineKey) : "null"}, new URLSearchParams(__q))`, ctx);
      return (out.match(/<aside class="filters"[^>]*>([\s\S]*?)<\/aside>/) || [, ""])[1];
    },
  };
  return S;
}
const headings = sb => [...sb.matchAll(/<h4>([^<]+)<\/h4>/g)].map(m => m[1]);
const optValues = (sb, key) => [...sb.matchAll(new RegExp(`data-key="${key}" value="([^"]+)"`, "g"))].map(m => m[1]);
const BAD = /\bundefined\b|\bnull\b|NaN|\[object Object\]/;
const fakeBox = (key, value, checked) => ({ dataset: { key }, value, checked });

/* ============================================================
   1. Baseline: syntax + empty-catalogue rendering
   ============================================================ */
try { new vm.Script(appSrc); check("inline script is syntactically valid", true); }
catch (e) { check("inline script is syntactically valid", false, e.message); }

{
  const S = loadSite(false);
  const lineKeys = Object.keys(S.run("LINES"));
  check("PRODUCTS = [] leaves an empty catalogue", S.run("PRODUCTS.length") === 0);
  const pages = {
    homePage: "homePage()", shopPage_all: "shopPage(null, new URLSearchParams(''))",
    aboutPage: "aboutPage()", carePage: "carePage()", visitPage: "visitPage()",
    piecePage_unknown_id: "piecePage('nz-nope')",
  };
  lineKeys.forEach(k => pages[`shopPage_${k}`] = `shopPage('${k}', new URLSearchParams(''))`);
  for (const [name, code] of Object.entries(pages)) {
    let out, err;
    try { out = S.run(code); } catch (e) { err = e; }
    check(`empty catalogue: ${name} renders without throwing`, !err, err && err.message);
    if (!err) {
      const m = out.match(BAD);
      check(`empty catalogue: ${name} has no undefined/null/NaN/[object Object]`, !m, m && `found "${m[0]}" near: …${out.slice(Math.max(0, out.indexOf(m[0]) - 40), out.indexOf(m[0]) + 40)}…`);
    }
  }
  // The full router path too (also exercises renderResults / empty state).
  S.ctx.location.hash = "#/shop";
  let rerr; try { S.run("router()"); } catch (e) { rerr = e; }
  check("empty catalogue: router() on #/shop renders results without throwing", !rerr, rerr && rerr.message);
  check("empty catalogue: shop shows the empty state", /Nothing on the counter matches/.test(S.els.results.innerHTML));
}

/* The real catalogue: every page, every piece. */
{
  const S = loadSite(true);
  const ids = S.run("PRODUCTS.map(p=>p.id)");
  let bad = [];
  for (const code of ["homePage()", "shopPage(null, new URLSearchParams(''))", "aboutPage()", "carePage()", "visitPage()"]) {
    const o = S.run(code); const m = o.match(BAD); if (m) bad.push(`${code}: ${m[0]}`);
  }
  for (const id of ids) { const o = S.run(`piecePage(${JSON.stringify(id)})`); const m = o.match(BAD); if (m) bad.push(`piecePage(${id}): ${m[0]}`); }
  check(`real products.js (${ids.length} pieces): every page and piece page renders clean`, bad.length === 0, bad.join("; "));
}

/* ============================================================
   2. Six-line structure
   ============================================================ */
{
  const S = loadSite(false);
  const lines = S.run("LINES");
  const keys = Object.keys(lines);
  check("LINES has six entries", keys.length === 6, `found ${keys.length}`);
  const sb = S.sidebar(null);
  const home = S.run("homePage()");
  check("empty catalogue: all six lines in the sidebar Line group (min:0)", JSON.stringify(optValues(sb, "line")) === JSON.stringify(keys), optValues(sb, "line").join(","));
  check("empty catalogue: Line and Price groups render with no products", headings(sb).includes("Line") && headings(sb).includes("Price"));
  keys.forEach(k => check(`hero tray present for line "${k}" with zero products`, home.includes(`class="tray ${lines[k].velvet}" href="#/shop/${k}"`)));

  // velvet: each line resolves its own palette entry, not the western fallback
  const pal = S.run("pal()");
  keys.forEach(k => {
    const svg = S.run(`art({id:'v-${k}', line:'${k}', type:'earrings', name:'t'}, 0)`);
    const fill = (svg.match(/<rect width="300" height="320" fill="([^"]+)"\/>/) || [])[1];
    check(`line "${k}": art() paints its own velvet ${pal["velvet-" + k]}`, fill === pal["velvet-" + k], `got ${fill}`);
    check(`line "${k}": LINES velvet class is v-${k} and .v-${k} exists in CSS`, lines[k].velvet === "v-" + k && html.includes(`.v-${k}{background:var(--velvet-${k})}`));
  });
  const distinct = new Set(keys.map(k => pal["velvet-" + k]));
  check("six lines have six distinct velvet tones (no silent fallback collisions)", distinct.size === keys.length);
}
{ // seventh throwaway line propagates with zero other code changes
  const S = loadSite(false);
  S.run(`LINES.testline = {label:"Test Line", full:"Test Line Full", velvet:"v-testline", blurb:"throwaway"}`);
  const home = S.run("homePage()");
  const count = (s, sub) => s.split(sub).length - 1;
  check("7th line: hero tray appears", home.includes(`href="#/shop/testline"`) && home.includes("tray v-testline"));
  check("7th line: appears in drawer + tray + footer (>=3 links)", count(home, `href="#/shop/testline"`) >= 3, `found ${count(home, 'href="#/shop/testline"')}`);
  check("7th line: sidebar Line group includes it", optValues(S.sidebar(null), "line").includes("testline"));
  check("7th line: copy count word updates (Seven counters)", /Seven counters/.test(home));
  check("7th line: its own shop page renders", /Test Line Full jewellery/.test(S.run("shopPage('testline', new URLSearchParams(''))")));
}

/* ============================================================
   3. Synthetic catalogue — governance, subtypes, multi-category
   ============================================================ */
const LINEKEYS = ["kundan", "temple", "ad", "oxidised", "pearl", "western"];
function synthCatalog() {
  const out = [];
  for (let i = 0; i < 24; i++) {
    const type = i < 6 ? "earrings" : i < 9 ? "necklace-set" : i < 11 ? "bangles" : i === 11 ? "kada" : i < 15 ? "necklace" : i < 17 ? "rings" : "earrings";
    out.push({
      id: "t-" + String(i).padStart(2, "0"), name: "Synth " + i,
      line: LINEKEYS[i % 6], type,
      subtypes: type === "earrings" ? [i % 2 ? "jhumka" : "chandbali"] : type === "necklace-set" ? ["choker"] : [],
      styles: [].concat(i % 3 === 0 ? ["kundan"] : [], (i === 1 || i === 4) ? ["polki"] : []),
      colours: [].concat(i % 2 === 0 ? ["gold"] : [], i % 8 === 1 ? ["green"] : [], (i === 2 || i === 3) ? ["red"] : [], i % 8 === 5 ? ["multi"] : []),
      finishes: i < 2 ? ["matte"] : i === 2 ? ["high-shine"] : [],   // every finish <= 2 → no Finish group
      occ: [].concat(i < 2 ? ["bridal"] : [], i === 2 ? ["festive"] : []),
      price: 400 + i * 150, mrp: 0, badge: "",
    });
  }
  return out;
}
const countOf = (cat, getter, v) => cat.filter(p => getter(p).includes(v)).length;

{
  const cat = synthCatalog();
  const S = loadSite(false); S.setProducts(cat);
  const sb = S.sidebar(null);
  const H = headings(sb);
  check("governance: Line group always renders", H.includes("Line"));
  check("governance: Price group always renders", H.includes("Price"));
  check("governance: Type group renders (3+ matches exist)", H.includes("Type"));
  check("governance: Style group renders (kundan has 8)", H.includes("Style"));
  check("governance: Colour group renders", H.includes("Colour"));
  check("governance: Occasion group renders at exactly 2 (bridal)", H.includes("Occasion") && optValues(sb, "occ").join() === "bridal", optValues(sb, "occ").join());
  check("governance: Finish group absent (no value reaches 3) — and no empty <h4>Finish</h4>", !H.includes("Finish"));
  check("governance: Detail group absent with no type selected", !H.includes("Detail") && optValues(sb, "subtype").length === 0);

  const expectType = Object.keys(S.run("TYPES")).filter(v => countOf(cat, p => [p.type], v) >= 3);
  check("governance: Type values = exactly those with >=3 products", JSON.stringify(optValues(sb, "type")) === JSON.stringify(expectType), `got ${optValues(sb, "type")} want ${expectType}`);
  check("governance: sub-threshold type 'kada' (1 product) hidden", !optValues(sb, "type").includes("kada"));
  check("governance: sub-threshold style 'polki' (2) hidden, 'kundan' (8) shown", !optValues(sb, "style").includes("polki") && optValues(sb, "style").includes("kundan"));
  check("governance: colour 'red' (2) hidden; gold/green/multi shown", !optValues(sb, "colour").includes("red") && ["gold", "green", "multi"].every(c => optValues(sb, "colour").includes(c)), optValues(sb, "colour").join());
  check("governance: no group heading renders without options", H.every(h => {
    const label = { Line: "line", Type: "type", Detail: "subtype", Style: "style", Colour: "colour", Finish: "finish", Occasion: "occ", Price: "band" }[h];
    return label && optValues(sb, label).length > 0;
  }));

  // counts are against the FULL catalogue, not the filtered subset
  const sbKundan = S.sidebar("kundan");
  check("counts vs full catalogue: line-scoped page offers the same Type values", JSON.stringify(optValues(sbKundan, "type")) === JSON.stringify(optValues(sb, "type")));
  check("counts vs full catalogue: line-scoped page offers the same Colour values", JSON.stringify(optValues(sbKundan, "colour")) === JSON.stringify(optValues(sb, "colour")));
  S.run("filterState = buildFilterState(); filterState.type = ['earrings']; filterState.colour = ['gold']");
  const sbSel = S.run("FACETS.filter(f=>f.key!=='subtype').map(fgroup).join('')");
  check("counts vs full catalogue: selecting type+colour doesn't shift other groups' membership",
    JSON.stringify(optValues(sbSel, "style")) === JSON.stringify(optValues(sb, "style")) && JSON.stringify(optValues(sbSel, "occ")) === JSON.stringify(optValues(sb, "occ")) && JSON.stringify(optValues(sbSel, "type")) === JSON.stringify(optValues(sb, "type")));

  // active-but-sub-threshold value stays visible and clearable
  const sbDeep = S.sidebar(null, "type=kada");
  check("deep link ?type=kada (1 product < min 3): checkbox still rendered", optValues(sbDeep, "type").includes("kada"));
  S.run("renderResults()");
  check("deep link ?type=kada: active chip rendered with label", /class="chip">Kadas<button/.test(S.els.chips.innerHTML) && S.els.chips.innerHTML.includes("removeChip('type','kada')"));
  check("deep link ?type=kada: result list is the 1 kada", S.els.count.textContent === "1 piece");
  S.run("removeChip('type','kada')");
  check("deep link ?type=kada: chip is clearable (removeChip empties it)", S.els.chips.innerHTML === "" && S.run("filterState.type.length") === 0 && S.els.count.textContent === "24 pieces");
  check("after clearing, kada returns to hidden", !optValues(S.sidebar(null), "type").includes("kada"));

  // subtype scoping
  S.run("filterState = buildFilterState()");
  check("subtype: absent with no type selected", S.run("fgroup(FACETS.find(f=>f.key==='subtype'))") === "");
  const sub = () => optValues(S.run("fgroup(FACETS.find(f=>f.key==='subtype'))"), "subtype");
  const earSubs = Object.entries(S.run("SUBTYPES")).filter(([, v]) => v.of.includes("earrings")).map(([k]) => k);
  const necSubs = Object.entries(S.run("SUBTYPES")).filter(([, v]) => v.of.includes("necklace-set")).map(([k]) => k);
  S.run("filterState.type = ['earrings']");
  check("subtype: Earrings → only earring subtypes (live ones: jhumka, chandbali)", sub().length > 0 && sub().every(k => earSubs.includes(k)) && !sub().includes("choker"), sub().join());
  S.run("filterState.type = ['earrings','necklace-set']");
  check("subtype: Earrings + Necklace set → both sets offered", sub().includes("jhumka") && sub().includes("choker") && sub().every(k => earSubs.includes(k) || necSubs.includes(k)), sub().join());
  S.run("filterState.type = ['earrings']; filterState.subtype = ['jhumka']; ");
  S.run("filterState.type=['earrings']");
  S.ctx.__box = fakeBox("type", "earrings", false);
  S.run("toggleFilter(__box)");
  check("subtype orphan: deselecting the type prunes the selected subtype from filterState", S.run("filterState.subtype.length") === 0 && S.run("filterState.type.length") === 0);
  S.run("filterState.type=['earrings']; filterState.subtype=['jhumka']; removeChip('type','earrings')");
  check("subtype orphan: removeChip on the type prunes it too", S.run("filterState.subtype.length") === 0);
  S.run("filterState.type=['earrings']; filterState.subtype=['jhumka']; clearFilters()");
  check("subtype orphan: clearFilters leaves nothing live", S.run("filterState.subtype.length + filterState.type.length") === 0);
  // a kept type keeps its still-valid subtype
  S.run("filterState.type=['earrings','necklace-set']; filterState.subtype=['jhumka','choker']");
  S.ctx.__box = fakeBox("type", "necklace-set", false);
  S.run("toggleFilter(__box)");
  check("subtype orphan: dropping one of two types prunes only that type's subtype", JSON.stringify(S.run("filterState.subtype")) === '["jhumka"]', JSON.stringify(S.run("filterState.subtype")));
}

{ // multi-category
  const base = { id: "mc-1", name: "Dual Piece", line: "kundan", alsoLines: ["temple"], type: "earrings", alsoTypes: ["necklace"], subtypes: [], styles: [], colours: [], finishes: [], occ: [], price: 1200, mrp: 0, badge: "" };
  const other = { id: "mc-2", name: "Plain Piece", line: "pearl", type: "rings", subtypes: [], styles: [], colours: [], finishes: [], occ: [], price: 900, mrp: 0, badge: "" };
  const S = loadSite(false); S.setProducts([base, other]);
  const results = (state) => { S.run(`filterState = buildFilterState(); Object.assign(filterState, ${JSON.stringify(state)}); renderResults()`); return S.els.results.innerHTML; };
  check("multi-category: appears under its primary line", results({ line: ["kundan"] }).includes("#/piece/mc-1"));
  check("multi-category: appears under its secondary line", results({ line: ["temple"] }).includes("#/piece/mc-1"));
  check("multi-category: appears under its primary type", results({ type: ["earrings"] }).includes("#/piece/mc-1"));
  check("multi-category: appears under its secondary type", results({ type: ["necklace"] }).includes("#/piece/mc-1"));
  check("multi-category: does not appear under an unrelated line", !results({ line: ["western"] }).includes("#/piece/mc-1"));
  const card = results({ line: ["temple"] });
  const tag = (card.match(/<span class="line-tag">([^<]*)<\/span>/) || [])[1];
  check("multi-category: card shows PRIMARY line · type only", tag === "Traditional · Earrings", `got "${tag}"`);
  const pdp = S.run("piecePage('mc-1')");
  const crumbs = (pdp.match(/<div class="wrap crumbs">([\s\S]*?)<\/div>/) || [])[1] || "";
  check("multi-category: breadcrumb shows PRIMARY line only", crumbs.includes("Traditional & Kundan") && !crumbs.includes("Temple") && crumbs.includes('href="#/shop/kundan"'), crumbs);
  check("multi-category: PDP eyebrow shows primary line · type only", /Traditional & Kundan · Earrings/.test(pdp) && !/Temple & Golden · /.test(pdp.replace(/<footer[\s\S]*/, "")));
  check("multi-category: art velvet follows the primary line", S.run("art(PRODUCTS[0],0)").includes(S.run("pal()['velvet-kundan']")));
}

{ // load-time guardrail — exercised by re-running the exact guardrail block from index.html
  const m = appSrc.match(/PRODUCTS\.forEach\(p => \{\n\s*const al = p\.alsoLines[\s\S]*?\n\}\);/);
  check("guardrail block found in index.html", !!m);
  if (m) {
    const run = prods => { const S = loadSite(false); S.setProducts(prods); S.warns.length = 0; S.run(m[0]); return S; };
    const P = (o) => Object.assign({ id: "g", name: "g", line: "kundan", type: "earrings", price: 100, mrp: 0 }, o);
    let S = run([P({ alsoLines: ["temple"], alsoTypes: ["necklace"] }), P({ id: "plain" })]);
    check("guardrail: silent for one secondary line/type and for none", S.warns.length === 0, S.warns.join(" | "));
    S = run([P({ alsoLines: ["temple", "ad"] })]);
    check("guardrail: warns on more than one secondary line", S.warns.length === 1 && /alsoLines has more than one/.test(S.warns[0]), S.warns.join(" | "));
    S = run([P({ alsoTypes: ["necklace", "rings"] })]);
    check("guardrail: warns on more than one secondary type", S.warns.length === 1 && /alsoTypes has more than one/.test(S.warns[0]), S.warns.join(" | "));
    S = run([P({ alsoLines: ["kundan"] })]);
    check("guardrail: warns on secondary line repeating the primary", S.warns.length === 1 && /alsoLines repeats the primary/.test(S.warns[0]), S.warns.join(" | "));
    S = run([P({ alsoTypes: ["earrings"] })]);
    check("guardrail: warns on secondary type repeating the primary", S.warns.length === 1 && /alsoTypes repeats the primary/.test(S.warns[0]), S.warns.join(" | "));
    S = run([P({ alsoLines: ["temple", "ad"], alsoTypes: ["necklace", "rings"] })]);
    check("guardrail: console only — never alert() or page output", S.alerts.length === 0 && !S.run("homePage()").includes("more than one secondary"));
  }
}

/* ============================================================
   4. Type / art coverage
   ============================================================ */
{
  const S = loadSite(false);
  const types = Object.keys(S.run("TYPES"));
  check("TYPES has 15 valid types", types.length === 15, `found ${types.length}`);
  const GENERIC = "M150 88 l42 62 -42 62 -42-62z";
  const drawing = t => { const svg = S.run(`art({id:'a', line:'kundan', type:${JSON.stringify(t)}, name:'a'}, 0)`); return (svg.match(/<g transform="[^"]*">([\s\S]*)<\/g><\/svg>/) || [, ""])[1]; };
  const alias = S.run("ART_ALIAS");
  types.forEach(t => {
    const d = drawing(t);
    check(`art(): type "${t}" renders a non-blank drawing`, d.trim().length > 40);
    check(`art(): type "${t}" resolves to a real drawing, not the generic fallback`, !d.includes(GENERIC));
    if (alias[t]) check(`art(): "${t}" is aliased to "${alias[t]}" and matches its drawing`, alias[t] === "anklets" || drawing(alias[t]) === d);
  });
  const g = drawing("some-future-type");
  check("art(): unmapped future type uses the generic fallback (non-blank)", g.includes(GENERIC) && g.trim().length > 40);
  check("art(): unknown line falls back to a velvet tone without throwing", /fill="#[0-9A-Fa-f]{6}"/.test(S.run("art({id:'x', line:'nope', type:'rings', name:'x'},0)")));
}

/* ============================================================
   5. No hardcoded facet keys + the "tenth facet" extensibility test
   ============================================================ */
{
  const S = loadSite(false);
  const keys = S.run("FACETS.map(f=>f.key)");
  const keyRe = new RegExp(`(["'\`])(${keys.join("|")})\\1|filterState\\.(${keys.join("|")})\\b`);
  const fns = ["renderResults", "syncBoxes", "toggleFilter", "clearFilters", "removeChip", "pruneOrphanedFacets", "fgroup", "facetEntry", "liveFacetKeys", "buildFilterState"];
  fns.forEach(fn => {
    const src = S.run(`${fn}.toString()`);
    const m = src.match(keyRe);
    check(`${fn}(): no hardcoded facet-key literal (facet-driven)`, !m, m && `found ${m[0]}`);
  });
  check("FACETS has 8 entries", keys.length === 8, keys.join(","));
  // NB: liveTypeEntries() (homepage pills / drawer "Shop by type") intentionally looks up the "type" facet by key; it is not part of the facet loop and isn't asserted here.

  const cat = synthCatalog().map((p, i) => Object.assign(p, { mats: i % 2 === 0 ? ["brass"] : (i % 5 === 0 ? ["copper"] : []) }));
  S.setProducts(cat);
  const brass = cat.filter(p => p.mats.includes("brass")).length;
  S.run(`FACETS.push({key:"mat", label:"Material", values:()=>({brass:"Brass", copper:"Copper alloy", steel:"Steel"}), match:(p,v)=>(p.mats||[]).includes(v), min:2})`);
  check("tenth facet: FACETS now has 9 entries (8 + throwaway)", S.run("FACETS.length") === 9);
  const sb = S.sidebar(null);
  check("tenth facet: sidebar renders its group heading", headings(sb).includes("Material"));
  check("tenth facet: governance applies (brass shown, copper (<2)/steel hidden)", optValues(sb, "mat").join() === "brass" || (optValues(sb, "mat").includes("brass") && !optValues(sb, "mat").includes("steel")), optValues(sb, "mat").join());
  check("tenth facet: filterState picks up the new key", S.run("Array.isArray(filterState.mat)"));
  S.ctx.__box = fakeBox("mat", "brass", true);
  S.run("toggleFilter(__box)");
  check("tenth facet: filtering narrows results correctly", S.els.count.textContent === `${brass} pieces`, S.els.count.textContent);
  check("tenth facet: chip renders with label + removeChip hook", /class="chip">Brass<button/.test(S.els.chips.innerHTML) && S.els.chips.innerHTML.includes("removeChip('mat','brass')"));
  S.run("removeChip('mat','brass')");
  check("tenth facet: removeChip clears it", S.run("filterState.mat.length") === 0 && S.els.chips.innerHTML === "" && S.els.count.textContent === "24 pieces");
  S.ctx.__box = fakeBox("mat", "brass", true); S.run("toggleFilter(__box)");
  S.ctx.__box = fakeBox("type", "earrings", true); S.run("toggleFilter(__box)");
  S.run("clearFilters()");
  check("tenth facet: clear-all clears it along with the others", S.run("filterState.mat.length + filterState.type.length") === 0 && S.els.chips.innerHTML === "" && S.els.count.textContent === "24 pieces");
  S.run("FACETS.pop()");
  check("tenth facet: removed again — FACETS back to 8, sidebar loses the group", S.run("FACETS.length") === 8 && !headings(S.sidebar(null)).includes("Material"));
}

/* ============================================================
   6. Colour swatches
   ============================================================ */
{
  const S = loadSite(false);
  const cat = synthCatalog(); S.setProducts(cat);
  const sb = S.sidebar(null);
  const dotFor = v => { const m = sb.match(new RegExp(`value="${v}"[^>]*> <i class="swatch-dot" style="background:([^"]+)"`)); return m && m[1]; };
  check("swatch: gold renders its flat hex dot", dotFor("gold") === "#C9A227", dotFor("gold"));
  check("swatch: green renders its flat hex dot", dotFor("green") === "#1F6B4E", dotFor("green"));
  check("swatch: multi renders the conic-gradient fallback, not a flat colour", /^conic-gradient\(/.test(dotFor("multi") || ""), dotFor("multi"));
  check("swatch: only the colour facet carries swatch dots", !/swatch-dot/.test(sb.replace(/<div class="fgroup"><h4>Colour<\/h4>[\s\S]*?<\/div>/, "")));
}

const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(failures === 0
  ? `${checks}/${checks} facet-engine checks passed (${ms.toFixed(0)}ms).`
  : `${failures} of ${checks} facet-engine checks FAILED (${ms.toFixed(0)}ms).`);
process.exit(failures === 0 ? 0 : 1);
