#!/usr/bin/env node
// Regenerates ../data/relics.json from WFCD/warframe-items raw GitHub data.
// Run: node scripts/fetch-relics.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RAW_BASE,
  CATEGORY_FILES,
  buildCategoryMap,
  buildRelicsData,
} from '../js/data-builder.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '..', 'data', 'relics.json');

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WarframeRelicList/1.0' },
  });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.json();
}

async function main() {
  console.log('[1/3] Fetching Relics.json ...');
  const rawRelics = await fetchJson(`${RAW_BASE}/Relics.json`);

  console.log('[2/3] Fetching category data ...');
  const categoryMap = await buildCategoryMap((file) =>
    fetchJson(`${RAW_BASE}/${file}`)
  );

  console.log('[3/3] Building output JSON ...');
  const output = buildRelicsData(rawRelics, categoryMap);

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2));

  const counts = output.items.reduce((acc, it) => {
    acc[it.category] = (acc[it.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  items: ${output.items.length}`);
  console.log(`  by category:`, counts);
  console.log(`  source: ${RAW_BASE}`);
  console.log(`  category files referenced:`, CATEGORY_FILES.map(([, f]) => f).join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
