#!/usr/bin/env node
/**
 * fetch-images.mjs — run this from the root of the nazaakat website repo.
 *
 * Joins two files:
 *   1. The export from intake-station (SKU -> blob URLs, in order)
 *   2. Your finished catalog entries (id -> gallery paths, in order)
 *
 * and downloads each blob URL to its matching gallery path, so the images
 * land in the repo already named the way the catalog expects.
 *
 * Usage:
 *   node fetch-images.mjs intake-export.json entries.json
 *   node fetch-images.mjs intake-export.json entries.json --force
 *   node fetch-images.mjs intake-export.json entries.json --dry-run
 *
 * entries.json should be a JSON array of the catalog objects, e.g.
 *   [{ "id": "nz-107", "gallery": ["images/nz-107-jhumka-1.jpg", ...] }, ...]
 * Extra fields are ignored, so you can paste the full catalog entries in.
 */

import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [, , exportPath, entriesPath, ...flags] = process.argv;
const FORCE = flags.includes('--force');
const DRY = flags.includes('--dry-run');

if (!exportPath || !entriesPath) {
  console.error('Usage: node fetch-images.mjs <intake-export.json> <entries.json> [--force] [--dry-run]');
  process.exit(1);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    console.error(`Could not read ${path}: ${err.message}`);
    process.exit(1);
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const exported = await readJson(exportPath);
const entries = await readJson(entriesPath);

const pieces = Array.isArray(exported) ? exported : exported.pieces;
if (!Array.isArray(pieces)) {
  console.error('Export file has no "pieces" array.');
  process.exit(1);
}
if (!Array.isArray(entries)) {
  console.error('Entries file must be a JSON array of catalog objects.');
  process.exit(1);
}

// sku -> ordered blob URLs
const urlsBySku = new Map();
for (const piece of pieces) {
  const sku = piece.sku ?? piece.id;
  const urls = (piece.images ?? []).map((i) => (typeof i === 'string' ? i : i.url));
  if (sku) urlsBySku.set(sku, urls);
}

let downloaded = 0;
let skipped = 0;
const problems = [];

for (const entry of entries) {
  const sku = entry.id ?? entry.sku;
  const gallery = entry.gallery ?? [];

  if (!sku) {
    problems.push('An entry has no id — skipped.');
    continue;
  }

  const urls = urlsBySku.get(sku);
  if (!urls) {
    problems.push(`${sku}: no matching piece in the export file.`);
    continue;
  }
  if (urls.length !== gallery.length) {
    problems.push(
      `${sku}: ${urls.length} photo(s) in the export but ${gallery.length} gallery path(s). ` +
        `Fix the entry so the counts match, or images will be mismatched.`,
    );
    continue;
  }

  for (let i = 0; i < urls.length; i++) {
    const dest = resolve(process.cwd(), gallery[i]);

    if (!FORCE && (await exists(dest))) {
      console.log(`  skip   ${gallery[i]} (already there — use --force to overwrite)`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.log(`  would  ${gallery[i]}`);
      downloaded++;
      continue;
    }

    try {
      const res = await fetch(urls[i]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, buf);
      console.log(`  saved  ${gallery[i]}  (${(buf.length / 1024).toFixed(0)} KB)`);
      downloaded++;
    } catch (err) {
      problems.push(`${sku} photo ${i + 1}: ${err.message}`);
    }
  }
}

console.log(
  `\n${DRY ? 'Would download' : 'Downloaded'} ${downloaded}, skipped ${skipped}.`,
);

if (problems.length) {
  console.log('\nProblems:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}

console.log('\nNext: review the images, then commit them along with the catalog entries.');
