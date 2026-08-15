// Simple i18n table. Equipment names stay in English per spec.

export const STRINGS = {
  ja: {
    appTitle: 'Warframe Relic List',
    appSubtitle: '欲しい装備からレリックを逆引き',
    tabUnvaulted: '入手可能 (Unvaulted)',
    tabVaulted: '入手不可 (Vaulted)',
    tabResurgence: 'リサージェンス (期間限定)',
    tabBoth: 'すべて',
    searchPlaceholder: '装備名を検索 (例: Volt Prime)',
    categoryAll: 'すべて',
    category: {
      Warframe: 'Warframe',
      Primary: 'プライマリ',
      Secondary: 'セカンダリ',
      Melee: '近接',
      Sentinel: 'センチネル',
      SentinelWeapon: 'センチネル武器',
      Archwing: 'アークウィング',
      ArchGun: 'アークウィングガン',
      ArchMelee: 'アークウィング近接',
      Other: 'その他',
    },
    rarity: { Common: 'コモン', Uncommon: 'アンコモン', Rare: 'レア' },
    selectedNone: '装備が未選択です。検索バーから追加してください。',
    selectedHeader: '選択中の装備',
    clearAll: 'すべてクリア',
    update: '↻ 最新データを取得',
    updating: '更新中…',
    updateOk: '更新完了',
    updateFail: '更新失敗',
    lastUpdated: '最終更新',
    sourceLabel: 'データ元',
    cachePrefix: '(キャッシュ)',
    bundlePrefix: '(同梱)',
    matrixEmpty: 'ここに表が表示されます',
    removeItem: '削除',
    partsHeader: 'パーツ',
    noDrops: '—',
    suggestionsEmpty: '一致する装備はありません',
    langLabel: '言語',
    resurgenceAvailable: 'Prime リサージェンスで入手可能 (Aya / Regal Aya)',
    copyPartName: 'ゲーム内検索名をコピー',
    copied: 'コピーしました',
    copyFailed: 'コピーに失敗しました',
  },
  en: {
    appTitle: 'Warframe Relic List',
    appSubtitle: 'Reverse-lookup relics from gear you want',
    tabUnvaulted: 'Available (Unvaulted)',
    tabVaulted: 'Unavailable (Vaulted)',
    tabResurgence: 'Resurgence (limited)',
    tabBoth: 'All',
    searchPlaceholder: 'Search equipment (e.g. Volt Prime)',
    categoryAll: 'All',
    category: {
      Warframe: 'Warframe',
      Primary: 'Primary',
      Secondary: 'Secondary',
      Melee: 'Melee',
      Sentinel: 'Sentinel',
      SentinelWeapon: 'Sentinel Weapon',
      Archwing: 'Archwing',
      ArchGun: 'Arch-Gun',
      ArchMelee: 'Arch-Melee',
      Other: 'Other',
    },
    rarity: { Common: 'Common', Uncommon: 'Uncommon', Rare: 'Rare' },
    selectedNone: 'No equipment selected. Add from the search bar.',
    selectedHeader: 'Selected',
    clearAll: 'Clear all',
    update: '↻ Refresh data',
    updating: 'Updating…',
    updateOk: 'Updated',
    updateFail: 'Update failed',
    lastUpdated: 'Last updated',
    sourceLabel: 'Source',
    cachePrefix: '(cache)',
    bundlePrefix: '(bundled)',
    matrixEmpty: 'Matrix will appear here',
    removeItem: 'Remove',
    partsHeader: 'Parts',
    noDrops: '—',
    suggestionsEmpty: 'No matching equipment',
    langLabel: 'Language',
    resurgenceAvailable: 'Available via Prime Resurgence (Aya / Regal Aya)',
    copyPartName: 'Copy in-game name',
    copied: 'Copied',
    copyFailed: 'Copy failed',
  },
};

export function detectLang() {
  try {
    const stored = localStorage.getItem('wfrl.lang');
    if (stored === 'ja' || stored === 'en') return stored;
  } catch {}
  const nav = (navigator?.language ?? 'en').toLowerCase();
  return nav.startsWith('ja') ? 'ja' : 'en';
}

export function t(lang, key) {
  const dict = STRINGS[lang] ?? STRINGS.en;
  return key
    .split('.')
    .reduce((o, k) => (o == null ? undefined : o[k]), dict) ?? key;
}

// JA term dictionary for Prime part components.
// Used both standalone ("Systems" -> "システム") and as the head of
// "X Blueprint" -> "Xの設計図". Standalone "Blueprint" maps to 本体設計図
// (the main item recipe), distinct from the per-component "Xの設計図".
const PART_TERMS_JA = {
  Systems: 'システム',
  Neuroptics: 'ニューロティック',
  Chassis: 'シャーシ',
  Handle: 'ハンドル',
  Blade: 'ブレード',
  Blueprint: '本体設計図',
  Band: 'ベルト',
  Barrel: 'バレル',
  Blades: 'ブレード',
  Boot: 'ブート',
  Buckle: 'バックル',
  Carapace: 'キャラペス',
  Cerebrum: 'セリブラム',
  Chain: 'チェーン',
  Disc: 'ディスク',
  Gauntlet: 'ガントレット',
  Grip: 'グリップ',
  Guard: 'ガード',
  Harness: 'ハーネス',
  Head: 'ヘッド',
  Hilt: 'ヒルト',
  'Kubrow Collar': 'クブロウチョーカー',
  Link: 'リンク',
  'Lower Limb': 'ボトム リム',
  Ornament: 'オーナメント',
  Pouch: 'ポーチ',
  Receiver: 'レシーバー',
  Stars: 'スター',
  Stock: 'ストック',
  String: 'ストリング',
  'Upper Limb': 'トップ リム',
  Wings: 'ウイング',
};

// --- ゲーム内検索名の切り詰め（前方一致検索対応） --------------------------
// ゲーム側の JA ローカライズに誤字があり、正式名の完全一致ではゲーム内検索に
// ヒットしないパーツが存在する。Warframe の検索は前方一致のため、誤字が混入
// しない範囲まで切り詰めた接頭辞をコピーする。
//
// 【元に戻す方法】ゲーム側の誤字が修正されたら、下の定数を false にするだけで
// よい。buildInGameName() が PART_TERMS_JA / 'の設計図' を使う従来の完全名生成
// に戻る（その場合、下の SHORT 辞書は未使用になるが、再度切り替えられるよう
// 意図的に残す）。
const USE_SHORT_SEARCH_NAMES = true;

// 切り詰め後の JA 部位名（カタカナ一律 2 文字）。data/relics.json の全パーツ
// 構成で、同一装備内の他パーツ正式名に前方一致しないことを検証済み
// （scripts/check-short-names.mjs で再検証できる）。
// Stock / String はどちらも 'スト' になるが、同一装備に同居しないため可。
const PART_TERMS_JA_SHORT = {
  Systems: 'シス',
  Neuroptics: 'ニュ',
  Chassis: 'シャ',
  Handle: 'ハン',
  Blade: 'ブレ',
  Band: 'ベル',
  Barrel: 'バレ',
  Blades: 'ブレ',
  Boot: 'ブー',
  Buckle: 'バッ',
  Carapace: 'キャ',
  Cerebrum: 'セリ',
  Chain: 'チェ',
  Disc: 'ディ',
  Gauntlet: 'ガン',
  Grip: 'グリ',
  Guard: 'ガー',
  Harness: 'ハー',
  Head: 'ヘッ',
  Hilt: 'ヒル',
  'Kubrow Collar': 'クブ',
  Link: 'リン',
  'Lower Limb': 'ボト',
  Ornament: 'オー',
  Pouch: 'ポー',
  Receiver: 'レシ',
  Stars: 'スタ',
  Stock: 'スト',
  String: 'スト', // Stock と同一だが同居しないため可
  'Upper Limb': 'トッ',
  Wings: 'ウイ',
};

// 単独 Blueprint（本体設計図）用の接尾辞。JA では 'Xの設計図' -> 'Xの設'。
const BLUEPRINT_SUFFIX_JA = 'の設計図';
const BLUEPRINT_SUFFIX_JA_SHORT = 'の設';

// 切り詰め後の EN パーツ名（一律 3 文字）。EN は辞書変換せず生データのパーツ名
// をそのまま使うため、キーは data/relics.json に現れる完全なパーツ名
// (' Blueprint' 付きを含む)。Chain / 'Chassis Blueprint' (Cha)、
// Blade / Blades (Bla)、Systems / 'Systems Blueprint' (Sys) は同値になるが、
// いずれも同一装備に同居しないため可。
const PART_TERMS_EN_SHORT = {
  Band: 'Ban',
  Barrel: 'Bar',
  Blade: 'Bla',
  Blades: 'Bla',
  Blueprint: 'Blu',
  Boot: 'Boo',
  Buckle: 'Buc',
  Carapace: 'Car',
  Cerebrum: 'Cer',
  Chain: 'Cha',
  'Chassis Blueprint': 'Cha',
  Disc: 'Dis',
  Gauntlet: 'Gau',
  Grip: 'Gri',
  Guard: 'Gua',
  Handle: 'Han',
  'Harness Blueprint': 'Har',
  Head: 'Hea',
  Hilt: 'Hil',
  'Kubrow Collar Blueprint': 'Kub',
  Link: 'Lin',
  'Lower Limb': 'Low',
  'Neuroptics Blueprint': 'Neu',
  Ornament: 'Orn',
  Pouch: 'Pou',
  Receiver: 'Rec',
  Stars: 'Sta',
  Stock: 'Sto',
  String: 'Str',
  Systems: 'Sys',
  'Systems Blueprint': 'Sys',
  'Upper Limb': 'Upp',
  'Wings Blueprint': 'Win',
};

// 検証スクリプト用に辞書を公開する（アプリ本体からは参照しない）。
export const SEARCH_NAME_DICTS = {
  USE_SHORT_SEARCH_NAMES,
  PART_TERMS_JA,
  PART_TERMS_JA_SHORT,
  PART_TERMS_EN_SHORT,
  BLUEPRINT_SUFFIX_JA,
  BLUEPRINT_SUFFIX_JA_SHORT,
};

// Translate part names like "Systems Blueprint" -> "システムの設計図".
// Falls back to the original English name when the head term is not in
// the dictionary, so untranslated terms remain identifiable.
export function translatePartName(name, lang) {
  if (lang !== 'ja' || !name) return name;
  if (PART_TERMS_JA[name]) return PART_TERMS_JA[name];
  if (name.endsWith(' Blueprint')) {
    const head = name.slice(0, -' Blueprint'.length);
    const headJa = PART_TERMS_JA[head];
    if (headJa) return `${headJa}の設計図`;
  }
  return name;
}

// Build the in-game item name used by Warframe's search box, which only
// matches from the beginning of the name. JA rules observed in game:
// standalone "Blueprint" attaches with no space ("Xの設計図"), every other
// component takes a space ("X シャーシの設計図" / "X ストリング").
//
// USE_SHORT_SEARCH_NAMES が true のときは、ゲーム側の誤字を避けるため
// 「同一装備内の他パーツと被らない範囲」まで切り詰めた接頭辞を返す
// ("X シャーシの設計図" -> "X シャ", "Xの設計図" -> "Xの設")。
//
// Terms missing from the dictionary fall back to the full English name rather
// than emitting a broken or over-truncated name. 上流データに新しいパーツ名が
// 増えたとき、勝手に切り詰めて誤ヒットさせないための安全側フォールバック。
export function buildInGameName(itemName, partName, lang) {
  if (!itemName || !partName) return itemName || partName || '';

  if (lang !== 'ja') {
    const shortEn = USE_SHORT_SEARCH_NAMES ? PART_TERMS_EN_SHORT[partName] : null;
    return `${itemName} ${shortEn ?? partName}`;
  }

  const terms = USE_SHORT_SEARCH_NAMES ? PART_TERMS_JA_SHORT : PART_TERMS_JA;
  const bpSuffix = USE_SHORT_SEARCH_NAMES
    ? BLUEPRINT_SUFFIX_JA_SHORT
    : BLUEPRINT_SUFFIX_JA;

  if (partName === 'Blueprint') return `${itemName}${bpSuffix}`;

  if (partName.endsWith(' Blueprint')) {
    const headJa = terms[partName.slice(0, -' Blueprint'.length)];
    if (!headJa) return `${itemName} ${partName}`;
    // 切り詰め時は 'の設計図' ごと落とす ("X シャーシの設計図" -> "X シャ")。
    return USE_SHORT_SEARCH_NAMES
      ? `${itemName} ${headJa}`
      : `${itemName} ${headJa}${BLUEPRINT_SUFFIX_JA}`;
  }

  return `${itemName} ${terms[partName] ?? partName}`;
}
