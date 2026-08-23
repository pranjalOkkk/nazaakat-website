#!/usr/bin/env node
/* ------------------------------------------------------------
   check-wrap-padding.mjs — headless-Chromium layout check for the .wrap
   container's 20px horizontal padding, across every live route and a
   representative range of viewport widths.

   WHY THIS EXISTS: the site's `.wrap{padding:0 20px}` rule is the only
   thing providing side margins on any page whose section wraps a `.wrap`
   div directly in a viewport narrower than --maxw (1180px) — everywhere
   `.wrap` is combined with a companion class on the SAME element (e.g.
   `<div class="wrap shop-top">`), a same-specificity `padding` shorthand
   declared later in the stylesheet silently wins the whole property and
   zeroes .wrap's left/right. This exact bug (`.shop-top`/`.shop-body`/
   `.crumbs`/`.sec`/`.sec-tight` all doing this) shipped invisibly for the
   site's entire history because every other check in this project's test
   suite is a vm/jsdom harness that only confirms a class NAME is present
   in the rendered HTML string — none of them run real CSS cascade or
   layout, so none of them can see a later rule clobber an earlier one.
   A real browser is the only thing that catches this class of bug.

   This check is intentionally selector-agnostic: it queries every element
   carrying the `wrap` class (whether alone or combined with others) and
   asserts 20px of computed horizontal padding on each, rather than
   hardcoding the specific elements known to be at risk today. That means
   a *future* page or section that combines `wrap` with a new companion
   class is covered automatically, with no maintenance here.

   RUN THIS after any prompt that touches the <style> block or a
   page-render function — not only when a padding complaint resurfaces.

   Setup (one-time): npm install
     This alone is enough — package.json's `postinstall` hook runs
     `playwright install chromium` automatically. (Confirmed by testing:
     the bare `playwright` devDependency does NOT provision the browser
     binary on its own — without the postinstall hook, `npm install`
     succeeds but this script then fails with "Executable doesn't exist"
     until a manual `npx playwright install chromium` is run separately.
     The hook exists specifically so a fresh clone doesn't need that
     second, easy-to-forget step.) Needs ~200MB free disk and network
     access for the one-time Chromium download; already-cached installs
     are instant.
   Usage: node check-wrap-padding.mjs
   ------------------------------------------------------------ */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexUrl = "file://" + path.resolve(__dirname, "index.html").split(path.sep).join("/");

const EXPECTED_HORIZONTAL_PADDING = 20; // px — from .wrap{padding:0 20px} in index.html
const WIDTHS = [390, 768, 900, 1024, 1280]; // mobile, tablet, the 700-1180px gap where .wrap
                                             // fills the viewport and its own padding is the
                                             // *only* source of a side gutter, and desktop
const ROUTES = ["#/", "#/shop", "#/shop/kundan", "#/piece/nz-101", "#/about", "#/care", "#/visit"];
// "#/palettes" is excluded — its route is commented out in router() (see STATUS.md), so it
// currently falls through to the homepage and would just re-test that route redundantly.

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // This check is about layout, not connectivity — block everything but the local file
  // itself (Google Fonts, the Google Maps embed on #/visit, etc. would otherwise make real
  // network calls on every run).
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith("file://") ? route.continue() : route.abort();
  });

  await page.goto(indexUrl);

  let checks = 0;
  let failures = 0;

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const hash of ROUTES) {
      await page.evaluate((h) => {
        window.location.hash = h;
        window.router();
      }, hash);
      await page.waitForTimeout(50);

      const wraps = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".wrap")).map((el) => {
          const cs = getComputedStyle(el);
          return {
            className: el.className,
            paddingLeft: parseFloat(cs.paddingLeft),
            paddingRight: parseFloat(cs.paddingRight),
          };
        });
      });

      if (wraps.length === 0) {
        console.log(`FAIL  ${width}px ${hash} — no .wrap elements found on this route`);
        failures++;
        checks++;
        continue;
      }

      for (const w of wraps) {
        checks++;
        const ok =
          Math.abs(w.paddingLeft - EXPECTED_HORIZONTAL_PADDING) < 0.5 &&
          Math.abs(w.paddingRight - EXPECTED_HORIZONTAL_PADDING) < 0.5;
        if (!ok) {
          console.log(
            `FAIL  ${width}px ${hash} .${w.className.split(" ").join(".")} — ` +
              `padding-left:${w.paddingLeft}px padding-right:${w.paddingRight}px ` +
              `(expected ${EXPECTED_HORIZONTAL_PADDING}px each)`
          );
          failures++;
        }
      }
    }
  }

  await browser.close();

  console.log(`\n${checks - failures}/${checks} .wrap padding checks passed.`);
  if (failures > 0) {
    console.error(`${failures} check(s) FAILED — a companion class is clobbering .wrap's horizontal padding.`);
    process.exitCode = 1;
  } else {
    console.log("All .wrap elements hold 20px horizontal padding across every route and width tested.");
  }
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exitCode = 1;
});
