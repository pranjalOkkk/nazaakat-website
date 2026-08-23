#!/usr/bin/env node
/**
 * prepare-batch.mjs — run this from wherever your export JSON lives.
 *
 * Reads an intake-station export and downloads every photo with a filename
 * that encodes which product it belongs to and its position in that
 * product's gallery:
 *
 *     nz-000002-01.jpg   <- cover (position 1)
 *     nz-000002-02.jpg
 *     nz-000003-01.jpg   <- cover of the next piece
 *
 * Because order is in the filename, you can attach the images to chat in
 * any order at all — no need to keep track of which one was the cover.
 *
 * Usage:
 *   node prepare-batch.mjs intake-export-2026-08-23.json
 *   node prepare-batch.mjs "intake-export-2026-08-23 (1).json"
 *   node prepare-batch.mjs export.json --out mybatch
 *   node prepare-batch.mjs export.json --force
 */

import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const exportPath = args.find((a) => !a.startsWith('--'));
const FORCE = args.includes('--force');

const outIdx = args.indexOf('--out');
const outDir = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : 'batch';

if (!exportPath) {
  console.error('Usage: node prepare-batch.mjs <intake-export.json> [--out DIR] [--force]');
  console.error('Tip: quote the filename if it contains spaces or parentheses.');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(await readFile(exportPath, 'utf8'));
} catch (err) {
  console.error(`Could not read ${exportPath}: ${err.message}`);
  process.exit(1);
}

const pieces = Array.isArray(data) ? data : data.pieces;
if (!Array.isArray(pieces) || pieces.length === 0) {
  console.error('That file has no "pieces" array, or it is empty.');
  process.exit(1);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// Blob URLs carry a real extension; fall back to .jpg if one is ever missing.
function extFor(url) {
  const clean = url.split('?')[0];
  const ext = extname(clean).toLowerCase();
  return /^\.(jpe?g|png|webp|heic)$/.test(ext) ? ext : '.jpg';
}

await mkdir(outDir, { recursive: true });

let saved = 0;
let skipped = 0;
const problems = [];

for (const piece of pieces) {
  const id = piece.id ?? piece.sku;
  if (!id) {
    problems.push('A piece in the export has no id — skipped.');
    continue;
  }

  const images = piece.images ?? [];
  if (images.length === 0) {
    problems.push(`${id}: no images listed.`);
    continue;
  }

  console.log(`\n${id} — ${images.length} photo${images.length === 1 ? '' : 's'}`);

  for (let i = 0; i < images.length; i++) {
    const url = typeof images[i] === 'string' ? images[i] : images[i].url;
    if (!url) {
      problems.push(`${id} photo ${i + 1}: no URL.`);
      continue;
    }

    const position = String(i + 1).padStart(2, '0');
    const name = `${id}-${position}${extFor(url)}`;
    const dest = join(outDir, name);

    if (!FORCE && (await exists(dest))) {
      console.log(`  skip   ${name} (already there — use --force to overwrite)`);
      skipped++;
      continue;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf);
      const label = i === 0 ? '  (cover)' : '';
      console.log(`  saved  ${name}  ${(buf.length / 1024).toFixed(0)} KB${label}`);
      saved++;
    } catch (err) {
      problems.push(`${id} photo ${i + 1}: ${err.message}`);
    }
  }
}

console.log(`\nSaved ${saved}, skipped ${skipped}, into ./${outDir}/`);

if (problems.length) {
  console.log('\nProblems:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}

console.log(
  `\nNext: attach everything in ./${outDir}/ to chat, in any order — the\n` +
    `filenames carry the product and position, so nothing can get mixed up.`,
);
