// Pure data-processing module shared by:
//   - scripts/fetch-relics.mjs  (Node side; writes data/relics.json)
//   - js/data.mjs               (browser side; powers the "Update" button)
//
// Source files (from WFCD/warframe-items, MIT licensed, served via jsDelivr):
//   data/json/Relics.json    -> raw relic + reward + vaulted flags
//   data/json/<Category>.json -> classifies parent items as Warframe / Primary / etc.
//
// Runtime refreshes intentionally use the latest upstream data so users can
// pick up new relic information without waiting for this repository to update.
// Browser-side validation limits the risk of malformed or unexpected data.

export const RAW_BASE =
  'https://cdn.jsdelivr.net/gh/WFCD/warframe-items@master/data/json';

export const UPSTREAM_REPO = 'https://github.com/WFCD/warframe-items';
export const UPSTREAM_LICENSE = 'MIT';
export const UPSTREAM_COPYRIGHT = 'Copyright (c) 2017 Kaptard';

export const TIERS = ['Lith', 'Meso', 'Neo', 'Axi'];

// Order matters: the first category whose file contains a name wins.
// Warframes first so "Excalibur Prime" (Warframe) doesn't match a hypothetical weapon.
export const CATEGORY_FILES = [
  ['Warframe', 'Warframes.json'],
  ['Primary', 'Primary.json'],
  ['Secondary', 'Secondary.json'],
  ['Melee', 'Melee.json'],
  ['Sentinel', 'Sentinels.json'],
  ['SentinelWeapon', 'SentinelWeapons.json'],
  ['Archwing', 'Archwing.json'],
  ['ArchGun', 'Arch-Gun.json'],
  ['ArchMelee', 'Arch-Melee.json'],
];

const PART_SUFFIX_RE =
  /\s+(Blueprint|Chassis|Neuroptics|Systems|Barrel|Receiver|Stock|Blade|Handle|Link|String|Upper Limb|Lower Limb|Disc|Grip|Head|Pouch|Ornament|Boot|Star|Hilt|Harness|Wings|Carapace|Cerebrum)$/i;

const RELIC_NAME_RE = /^(Lith|Meso|Neo|Axi)\s+(\S+)\s+Intact$/;
const PRIME_PARTS_RE = /^(.+? Prime)\s+(.+)$/;
const SAFE_IMAGE_NAME_RE = /^[a-z0-9._& -]+\.(png|jpe?g|webp)$/i;

export function rarityRank(r) {
  return r === 'Rare' ? 0 : r === 'Uncommon' ? 1 : 2;
}

export function safeImageName(imageName) {
  if (typeof imageName !== 'string') return null;
  if (!SAFE_IMAGE_NAME_RE.test(imageName)) return null;
  if (imageName.includes('..') || imageName.includes('/') || imageName.includes('\\')) {
    return null;
  }
  return imageName;
}

// WFCD Relics.json tags every Intact reward as "Uncommon" or "Rare" based on
// reward role rather than the true game rarity. The underlying drop chance is
// authoritative — Intact relics use exactly three tiers:
//   Common   25.33 %  (3 slots)
//   Uncommon 11.00 %  (2 slots)
//   Rare      2.00 %  (1 slot)
// Convert via chance instead of trusting the tag.
function rarityFromChance(chance) {
  if (chance >= 20) return 'Common';
  if (chance >= 5) return 'Uncommon';
  return 'Rare';
}

function parsePrimeName(itemName) {
  const m = itemName.match(PRIME_PARTS_RE);
  if (!m) return null;
  return { parent: m[1], part: m[2] };
}

// Build "Volt Prime" -> { category, imageName, componentImages } map from the
// category JSONs. `loadJson(filename)` should return parsed JSON for the given
// filename, or throw — caller handles errors via try/catch around buildCategoryMap.
//
// The parent entry contains `components[]`, each with its own imageName
// ("prime-chassis.png", etc). We index those by component name so buildRelicsData
// can decorate each part entry with a part icon.
export async function buildCategoryMap(loadJson) {
  const map = new Map();
  for (const [category, file] of CATEGORY_FILES) {
    let items;
    try {
      items = await loadJson(file);
    } catch {
      continue;
    }
    for (const it of items ?? []) {
      if (typeof it?.name !== 'string') continue;
      if (!it.name.includes(' Prime')) continue;
      const base = it.name.replace(PART_SUFFIX_RE, '');
      if (!base.endsWith(' Prime')) continue;
      const isParent = it.name === base;
      const componentImages = isParent && Array.isArray(it.components)
        ? Object.fromEntries(
            it.components
              .filter((c) => c?.name && c?.imageName)
              .map((c) => [c.name, safeImageName(c.imageName)])
              .filter(([, imageName]) => imageName)
          )
        : null;
      const existing = map.get(base);
      if (!existing) {
        map.set(base, {
          category,
          imageName: safeImageName(it.imageName),
          isParent,
          componentImages,
        });
      } else if (isParent && !existing.isParent) {
        map.set(base, {
          category,
          imageName: safeImageName(it.imageName),
          isParent: true,
          componentImages,
        });
      }
    }
  }
  return map;
}

// Match WFCD component names to our derived part names.
// Warframe parts in Relics.json are "Volt Prime Chassis Blueprint" (parsed -> "Chassis Blueprint"),
// while components[] uses just "Chassis". Weapons match directly ("Barrel" -> "Barrel").
function lookupPartImage(partName, componentImages) {
  if (!componentImages) return null;
  if (componentImages[partName]) return componentImages[partName];
  const stripped = partName.replace(/\s+Blueprint$/i, '');
  if (stripped !== partName && componentImages[stripped]) return componentImages[stripped];
  return null;
}

// Take raw Relics.json + category map, produce the compact site-friendly
// structure rendered by the matrix view.
export function buildRelicsData(rawRelics, categoryMap) {
  const items = new Map();

  for (const relic of rawRelics ?? []) {
    if (relic?.type !== 'Relic') continue;
    if (!relic.name?.endsWith(' Intact')) continue;
    const m = relic.name.match(RELIC_NAME_RE);
    if (!m) continue;
    const [, tier, code] = m;
    const vaulted = !!relic.vaulted;

    for (const reward of relic.rewards ?? []) {
      const itemName = reward?.item?.name;
      if (!itemName) continue;
      const parsed = parsePrimeName(itemName);
      if (!parsed) continue;
      const { parent, part } = parsed;
      const entry = categoryMap.get(parent);
      const category = entry?.category ?? 'Other';
      const imageName = safeImageName(entry?.imageName);
      const componentImages = entry?.componentImages ?? null;

      if (!items.has(parent)) {
        items.set(parent, {
          name: parent,
          category,
          imageName,
          componentImages,
          parts: new Map(),
        });
      }
      const itemEntry = items.get(parent);
      if (!itemEntry.parts.has(part)) {
        itemEntry.parts.set(part, { Lith: [], Meso: [], Neo: [], Axi: [] });
      }
      itemEntry.parts.get(part)[tier].push({
        relic: code,
        rarity: rarityFromChance(reward.chance),
        vaulted,
      });
    }
  }

  const output = {
    lastUpdated: new Date().toISOString(),
    source: RAW_BASE,
    upstream: {
      repo: UPSTREAM_REPO,
      license: UPSTREAM_LICENSE,
      copyright: UPSTREAM_COPYRIGHT,
    },
    notice:
      'Derived from WFCD/warframe-items (MIT). Equipment names and image filenames originate from Warframe, a trademark of Digital Extremes Ltd.',
    items: [],
  };

  for (const item of items.values()) {
    const parts = [];
    for (const [partName, drops] of item.parts) {
      const sorted = {};
      for (const tier of TIERS) {
        // Same relic can appear multiple times across reward states; dedupe by code.
        const seen = new Map();
        for (const d of drops[tier]) {
          if (!seen.has(d.relic)) seen.set(d.relic, d);
        }
        sorted[tier] = [...seen.values()].sort((a, b) => {
          const r = rarityRank(a.rarity) - rarityRank(b.rarity);
          return r !== 0 ? r : a.relic.localeCompare(b.relic);
        });
      }
      parts.push({
        name: partName,
        imageName: lookupPartImage(partName, item.componentImages),
        drops: sorted,
      });
    }
    parts.sort((a, b) => {
      if (a.name === 'Blueprint') return -1;
      if (b.name === 'Blueprint') return 1;
      return a.name.localeCompare(b.name);
    });
    output.items.push({
      name: item.name,
      category: item.category,
      imageName: item.imageName,
      parts,
    });
  }

  output.items.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return output;
}
