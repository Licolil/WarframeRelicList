// Simple i18n table. Equipment names stay in English per spec.

export const STRINGS = {
  ja: {
    appTitle: 'Warframe Relic List',
    appSubtitle: '欲しい装備からレリックを逆引き',
    tabUnvaulted: '入手可能 (Unvaulted)',
    tabVaulted: '入手不可 (Vaulted)',
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
  },
  en: {
    appTitle: 'Warframe Relic List',
    appSubtitle: 'Reverse-lookup relics from gear you want',
    tabUnvaulted: 'Available (Unvaulted)',
    tabVaulted: 'Unavailable (Vaulted)',
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
  Band: 'バンド',
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
