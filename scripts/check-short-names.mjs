#!/usr/bin/env node
// ゲーム内検索名の切り詰め（js/i18n.mjs の *_SHORT 辞書）を検証する。
//
// 判定基準: 同一 Prime 装備内のパーツ同士で被らないこと。装備名の部分は装備
// 間で被らないため、比較はアイテム名を除いたパーツ部分の文字列だけで行う。
// あるパーツの切り詰め名が、同じ装備の他パーツの「正式名」に前方一致したら NG
// （前方一致検索で意図しないパーツを引いてしまうため）。
//
// 使い方: node scripts/check-short-names.mjs
// 辞書を編集したとき、および data/relics.json を更新したときに実行する。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { SEARCH_NAME_DICTS } from '../js/i18n.mjs';

const {
  PART_TERMS_JA,
  PART_TERMS_JA_SHORT,
  PART_TERMS_EN_SHORT,
  BLUEPRINT_SUFFIX_JA,
  BLUEPRINT_SUFFIX_JA_SHORT,
} = SEARCH_NAME_DICTS;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLUEPRINT_SUFFIX_EN = ' Blueprint';

/** "Chassis Blueprint" -> "Chassis" / "Systems" -> "Systems" */
function headTerm(partName) {
  return partName.endsWith(BLUEPRINT_SUFFIX_EN)
    ? partName.slice(0, -BLUEPRINT_SUFFIX_EN.length)
    : partName;
}

// 正式名／切り詰め名の「パーツ部分」だけを組み立てる（装備名は含めない）。
// buildInGameName() と同じ規則をたどるが、比較対象が装備名を除いた文字列で
// あるため、ここでは独立に組み立てる。
const NAMES = {
  ja: {
    full(partName) {
      if (partName === 'Blueprint') return BLUEPRINT_SUFFIX_JA;
      const head = headTerm(partName);
      const ja = PART_TERMS_JA[head];
      if (!ja) return partName;
      return head === partName ? ja : `${ja}${BLUEPRINT_SUFFIX_JA}`;
    },
    short(partName) {
      if (partName === 'Blueprint') return BLUEPRINT_SUFFIX_JA_SHORT;
      return PART_TERMS_JA_SHORT[headTerm(partName)] ?? partName;
    },
    missing(partName) {
      if (partName === 'Blueprint') return null;
      return PART_TERMS_JA_SHORT[headTerm(partName)] ? null : headTerm(partName);
    },
  },
  en: {
    full: (partName) => partName,
    short: (partName) => PART_TERMS_EN_SHORT[partName] ?? partName,
    missing: (partName) => (PART_TERMS_EN_SHORT[partName] ? null : partName),
  },
};

function loadItems() {
  const path = join(ROOT, 'data', 'relics.json');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(`data/relics.json を読み込めません: ${err.message}`);
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error('data/relics.json に items がありません');
  }
  return parsed.items;
}

function checkCollisions(items, lang) {
  const { full, short } = NAMES[lang];
  const problems = [];
  for (const item of items) {
    const partNames = (item.parts ?? []).map((p) => p.name);
    for (const a of partNames) {
      for (const b of partNames) {
        if (a === b) continue;
        if (full(b).startsWith(short(a))) {
          problems.push(
            `${item.name}: ${a} -> 「${short(a)}」が ${b} -> 「${full(b)}」に前方一致`,
          );
        }
      }
    }
  }
  return problems;
}

function checkCoverage(items, lang) {
  const { missing } = NAMES[lang];
  const gaps = new Set();
  for (const item of items) {
    for (const part of item.parts ?? []) {
      const gap = missing(part.name);
      if (gap) gaps.add(gap);
    }
  }
  return [...gaps].sort();
}

function main() {
  const items = loadItems();
  const partCount = items.reduce((n, i) => n + (i.parts?.length ?? 0), 0);
  let failed = false;

  for (const lang of ['ja', 'en']) {
    const collisions = checkCollisions(items, lang);
    const gaps = checkCoverage(items, lang);

    if (gaps.length) {
      failed = true;
      console.error(`[${lang}] 辞書に未登録のパーツ名 ${gaps.length} 件:`);
      for (const g of gaps) console.error(`  - ${g}`);
    }
    if (collisions.length) {
      failed = true;
      console.error(`[${lang}] 前方一致衝突 ${collisions.length} 件:`);
      for (const c of collisions) console.error(`  - ${c}`);
    }
    if (!gaps.length && !collisions.length) {
      console.log(`[${lang}] OK — 衝突なし / 辞書の取りこぼしなし`);
    }
  }

  console.log(`検査対象: ${items.length} 装備 / ${partCount} パーツ`);
  if (failed) process.exitCode = 1;
}

main();
