// Prime Resurgence (Varzia) data loader.
//
// Fetches the current Varzia inventory from warframestat.us and resolves each
// inventory item to a user-facing relic code (e.g. "Lith A11") by looking up
// the DE internal `uniqueName` against WFCD's Relics.json. The trader API
// returns DE codenames (e.g. "T1 Void Projection ... Bronze"), not the
// localized "Lith A11 Relic" string, so the lookup table is required.
//
// Results are cached in localStorage with a long TTL because the rotation
// cycles on the order of weeks; the user can force a refresh via the header
// refresh button.

// `language=en` is required server-side post-caching rollout — without it the
// server returns 404. The locale doesn't affect the parsed data because we
// match by `uniqueName`, not by the localized item string.
const API_URL = 'https://api.warframestat.us/pc/vaultTrader?language=en';
const RELICS_URL =
  'https://cdn.jsdelivr.net/gh/WFCD/warframe-items@master/data/json/Relics.json';
const CACHE_KEY = 'wfrl.resurgenceCache.v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const MAX_INVENTORY = 500;
const MAX_ITEM_NAME_LENGTH = 200;
const MAX_RELICS_ENTRIES = 5000;

const INTACT_SUFFIX = ' Intact';

export async function loadResurgentRelics() {
  const cached = readCache();
  if (cached && !isCacheStale(cached)) {
    return { relics: new Set(cached.relics), source: 'cache' };
  }
  try {
    const fresh = await fetchAndParse();
    writeCache(fresh);
    return { relics: new Set(fresh.relics), source: 'network' };
  } catch (err) {
    if (cached) {
      // Network failed — serve stale cache rather than dropping the feature.
      return { relics: new Set(cached.relics), source: 'cache-stale' };
    }
    console.warn('Resurgence fetch failed:', err);
    return { relics: new Set(), source: 'empty' };
  }
}

export async function refreshResurgentRelics() {
  try {
    const fresh = await fetchAndParse();
    writeCache(fresh);
    return { relics: new Set(fresh.relics), source: 'network' };
  } catch (err) {
    console.warn('Resurgence refresh failed:', err);
    const cached = readCache();
    if (cached) return { relics: new Set(cached.relics), source: 'cache-stale' };
    return { relics: new Set(), source: 'empty' };
  }
}

async function fetchAndParse() {
  const [traderRes, relicsRes] = await Promise.all([
    fetch(API_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }),
    fetch(RELICS_URL, { headers: { Accept: 'application/json' } }),
  ]);
  if (!traderRes.ok) throw new Error(`vaultTrader fetch failed: ${traderRes.status}`);
  if (!relicsRes.ok) throw new Error(`Relics.json fetch failed: ${relicsRes.status}`);
  const trader = await traderRes.json();
  const relics = await relicsRes.json();
  const lookup = buildRelicLookup(relics);
  return {
    relics: extractRelicCodes(trader, lookup),
    fetchedAt: Date.now(),
  };
}

// Build Map<uniqueNameSuffix, "Era Slot"> from Relics.json.
// `uniqueName` looks like ".../VoidProjections/T1VoidProjectionGaussGrendelVaultABronze";
// the trailing path segment matches the trader API item with whitespace stripped.
// We restrict to "Intact" entries because each relic appears 4× (one per refinement).
export function buildRelicLookup(relics) {
  const map = new Map();
  if (!Array.isArray(relics)) return map;
  const limit = Math.min(relics.length, MAX_RELICS_ENTRIES);
  for (let i = 0; i < limit; i++) {
    const r = relics[i];
    if (!r || typeof r !== 'object') continue;
    const uniqueName = typeof r.uniqueName === 'string' ? r.uniqueName : '';
    const name = typeof r.name === 'string' ? r.name : '';
    if (!uniqueName || !name) continue;
    if (!name.endsWith(INTACT_SUFFIX)) continue;
    const suffix = uniqueName.split('/').pop();
    if (!suffix) continue;
    const code = name.slice(0, -INTACT_SUFFIX.length).trim();
    if (!code) continue;
    map.set(suffix, code);
  }
  return map;
}

// Tolerant extractor: the API can return either a single trader object or an
// array of platform-keyed entries depending on path. Defensively walk both.
export function extractRelicCodes(payload, lookup) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const codes = new Set();
  if (!(lookup instanceof Map) || lookup.size === 0) return [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.active === false) continue;
    const inventory = Array.isArray(entry.inventory) ? entry.inventory : [];
    if (inventory.length > MAX_INVENTORY) continue;
    for (const slot of inventory) {
      if (!slot || typeof slot !== 'object') continue;
      const itemName = typeof slot.item === 'string' ? slot.item : '';
      if (!itemName || itemName.length > MAX_ITEM_NAME_LENGTH) continue;
      const key = itemName.replace(/\s+/g, '');
      const code = lookup.get(key);
      if (code) codes.add(code);
    }
  }
  return [...codes];
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.relics)) return null;
    if (!Number.isFinite(parsed.fetchedAt)) return null;
    if (parsed.relics.length > MAX_INVENTORY) return null;
    return {
      relics: parsed.relics.filter(
        (s) => typeof s === 'string' && s.length <= MAX_ITEM_NAME_LENGTH
      ),
      fetchedAt: parsed.fetchedAt,
    };
  } catch {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Quota exhausted or storage disabled — non-fatal.
  }
}

function isCacheStale(cached) {
  return Date.now() - cached.fetchedAt > CACHE_TTL_MS;
}
