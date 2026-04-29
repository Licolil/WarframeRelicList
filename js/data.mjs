// Browser-side data loading.
//   default  : fetch ./data/relics.json (bundled)
//   refresh  : fetch raw GitHub data, rebuild via shared data-builder, store in
//              localStorage. Future loads prefer cache if newer than bundled.

import {
  RAW_BASE,
  CATEGORY_FILES,
  TIERS,
  buildCategoryMap,
  buildRelicsData,
  safeImageName,
} from './data-builder.mjs';

const CACHE_KEY = 'wfrl.relicsCache.v1';
const BUNDLE_URL = './data/relics.json';
const MAX_ITEMS = 500;
const MAX_PARTS_PER_ITEM = 20;
const MAX_DROPS_PER_TIER = 200;
const MAX_TEXT_LENGTH = 120;
const CATEGORIES = new Set([...CATEGORY_FILES.map(([category]) => category), 'Other']);
const RARITIES = new Set(['Common', 'Uncommon', 'Rare']);

export async function loadInitial() {
  // Prefer cache if it parses and is newer than the bundle.
  const cached = readCache();
  let bundle = null;
  try {
    bundle = validateRelicsData(await fetchJson(BUNDLE_URL));
  } catch (err) {
    if (cached) return { data: cached, source: 'cache' };
    throw err;
  }
  if (cached && Date.parse(cached.lastUpdated) > Date.parse(bundle.lastUpdated)) {
    return { data: cached, source: 'cache' };
  }
  return { data: bundle, source: 'bundle' };
}

export async function refreshFromUpstream() {
  const rawRelics = await fetchJson(`${RAW_BASE}/Relics.json`);
  const categoryMap = await buildCategoryMap(async (file) =>
    fetchJson(`${RAW_BASE}/${file}`)
  );
  const data = validateRelicsData(buildRelicsData(rawRelics, categoryMap));
  writeCache(data);
  return { data, source: 'cache' };
}

export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch ${url} -> ${res.status}`);
  return res.json();
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateRelicsData(parsed);
  } catch {
    clearCache();
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or storage disabled — silently fall through; data still
    // works for the current session.
  }
}

function validateRelicsData(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid relic data');
  if (!Number.isFinite(Date.parse(data.lastUpdated))) {
    throw new Error('Invalid relic data timestamp');
  }
  if (!Array.isArray(data.items) || data.items.length > MAX_ITEMS) {
    throw new Error('Invalid relic item list');
  }

  return {
    ...data,
    items: data.items.map(validateItem),
  };
}

function validateItem(item) {
  if (!item || typeof item !== 'object') throw new Error('Invalid relic item');
  return {
    name: boundedString(item.name, 'item name'),
    category: CATEGORIES.has(item.category) ? item.category : 'Other',
    imageName: safeImageName(item.imageName),
    parts: validateParts(item.parts),
  };
}

function validateParts(parts) {
  if (!Array.isArray(parts) || parts.length > MAX_PARTS_PER_ITEM) {
    throw new Error('Invalid relic part list');
  }
  return parts.map((part) => {
    if (!part || typeof part !== 'object') throw new Error('Invalid relic part');
    return {
      name: boundedString(part.name, 'part name'),
      imageName: safeImageName(part.imageName),
      drops: validateDrops(part.drops),
    };
  });
}

function validateDrops(drops) {
  if (!drops || typeof drops !== 'object') throw new Error('Invalid relic drops');
  const output = {};
  for (const tier of TIERS) {
    const tierDrops = drops[tier];
    if (!Array.isArray(tierDrops) || tierDrops.length > MAX_DROPS_PER_TIER) {
      throw new Error(`Invalid ${tier} drop list`);
    }
    output[tier] = tierDrops.map((drop) => {
      if (!drop || typeof drop !== 'object') throw new Error('Invalid relic drop');
      if (!RARITIES.has(drop.rarity)) throw new Error('Invalid relic rarity');
      return {
        relic: boundedString(drop.relic, 'relic code'),
        rarity: drop.rarity,
        vaulted: !!drop.vaulted,
      };
    });
  }
  return output;
}

function boundedString(value, fieldName) {
  if (typeof value !== 'string') throw new Error(`Invalid ${fieldName}`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return trimmed;
}

export { CATEGORY_FILES };
