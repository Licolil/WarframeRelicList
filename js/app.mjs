// Main UI controller. Vanilla JS, no framework. Re-renders the affected DOM
// region on each state change rather than diffing — the matrix is small and
// mutations are user-driven, not high-frequency.

import { loadInitial, refreshFromUpstream } from './data.mjs';
import { TIERS, safeImageName } from './data-builder.mjs';
import {
  cdnImageUrl,
  cdnItemImageUrl,
  relicTierImageUrl,
  ayaIconUrl,
} from './images.mjs?v=20260429-jsdelivr-images';
import { detectLang, t, STRINGS, translatePartName } from './i18n.mjs';
import {
  loadResurgentRelics,
  refreshResurgentRelics,
} from './resurgence.mjs';

const STATE = {
  data: null, // { lastUpdated, items: [...] }
  source: 'bundle',
  lang: detectLang(),
  tab: 'all', // 'all' | 'unvaulted' | 'vaulted' | 'resurgence'
  category: 'all',
  query: '',
  // Map<itemName, { excludedParts: Set<partName> }>
  selected: new Map(),
  // Set<string> of currently-resurgent relic codes (e.g. "Lith V1").
  resurgentRelics: new Set(),
};

const RARITY_CLASS = {
  Common: 'rarity-common',
  Uncommon: 'rarity-uncommon',
  Rare: 'rarity-rare',
};
bootstrap();

async function bootstrap() {
  bindHeaderControls();
  bindTabs();
  bindSearch();
  bindCategoryFilter();
  applyStaticTranslations();

  const [relicResult, resurgenceResult] = await Promise.allSettled([
    loadInitial(),
    loadResurgentRelics(),
  ]);
  if (relicResult.status === 'fulfilled') {
    STATE.data = relicResult.value.data;
    STATE.source = relicResult.value.source;
  } else {
    console.error(relicResult.reason);
    showStatus(
      t(STATE.lang, 'updateFail') + ': ' + (relicResult.reason?.message ?? ''),
      true
    );
  }
  if (resurgenceResult.status === 'fulfilled') {
    STATE.resurgentRelics = resurgenceResult.value.relics;
  } else {
    console.warn('Resurgence load failed:', resurgenceResult.reason);
  }
  renderAll();
}

// ---------- event wiring ----------

function bindHeaderControls() {
  document.getElementById('lang-toggle').addEventListener('click', () => {
    STATE.lang = STATE.lang === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('wfrl.lang', STATE.lang); } catch {}
    document.documentElement.lang = STATE.lang;
    applyStaticTranslations();
    renderAll();
  });

  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    showStatus(t(STATE.lang, 'updating'), false);
    const [relicResult, resurgenceResult] = await Promise.allSettled([
      refreshFromUpstream(),
      refreshResurgentRelics(),
    ]);
    if (relicResult.status === 'fulfilled') {
      STATE.data = relicResult.value.data;
      STATE.source = relicResult.value.source;
    } else {
      console.error(relicResult.reason);
    }
    if (resurgenceResult.status === 'fulfilled') {
      STATE.resurgentRelics = resurgenceResult.value.relics;
    } else {
      console.warn('Resurgence refresh failed:', resurgenceResult.reason);
    }
    if (relicResult.status === 'fulfilled') {
      showStatus(t(STATE.lang, 'updateOk'), false);
    } else {
      showStatus(
        t(STATE.lang, 'updateFail') + ': ' + (relicResult.reason?.message ?? ''),
        true
      );
    }
    renderAll();
    btn.disabled = false;
  });
}

function bindTabs() {
  document.querySelectorAll('[data-tab]').forEach((el) => {
    el.addEventListener('click', () => {
      STATE.tab = el.dataset.tab;
      renderTabs();
      renderMatrix();
      // Suggestions are scoped per-tab (Resurgence narrows to resurgent gear),
      // so re-render even when the search box isn't focused — the next focus
      // should already reflect the new tab.
      renderSuggestions();
    });
  });
}

function bindSearch() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    STATE.query = input.value.trim();
    renderSuggestions();
  });
  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('blur', () => {
    // Delay so a click on a suggestion still fires before the list disappears.
    setTimeout(() => {
      document.getElementById('suggestions').hidden = true;
    }, 150);
  });
  document.getElementById('clear-all').addEventListener('click', () => {
    STATE.selected.clear();
    renderMatrix();
  });
}

function bindCategoryFilter() {
  document
    .getElementById('category-filter')
    .addEventListener('change', (e) => {
      STATE.category = e.target.value;
      renderSuggestions();
    });
}

// ---------- translation ----------

function applyStaticTranslations() {
  const L = STATE.lang;
  document.documentElement.lang = L;
  document.getElementById('app-title').textContent = t(L, 'appTitle');
  document.getElementById('refresh-btn').textContent = t(L, 'update');
  const langBtn = document.getElementById('lang-toggle');
  langBtn.textContent = L === 'ja' ? 'EN' : 'JA';
  langBtn.title = t(L, 'langLabel');
  document.getElementById('search-input').placeholder = t(L, 'searchPlaceholder');
  document.getElementById('clear-all').textContent = t(L, 'clearAll');
  document.getElementById('selected-header').textContent = t(L, 'selectedHeader');
  document.querySelector('[data-tab="unvaulted"]').textContent = t(L, 'tabUnvaulted');
  document.querySelector('[data-tab="vaulted"]').textContent = t(L, 'tabVaulted');
  document.querySelector('[data-tab="resurgence"]').textContent = t(L, 'tabResurgence');
  document.querySelector('[data-tab="all"]').textContent = t(L, 'tabBoth');

  const sel = document.getElementById('category-filter');
  const current = sel.value || 'all';
  const opts = [['all', t(L, 'categoryAll')]];
  for (const cat of Object.keys(STRINGS[L].category)) {
    opts.push([cat, t(L, `category.${cat}`)]);
  }
  sel.replaceChildren(
    ...opts.map(([val, label]) => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = label;
      return o;
    })
  );
  sel.value = current;
}

// ---------- render ----------

function renderAll() {
  renderTabs();
  renderUpdateBadge();
  renderMatrix();
  renderSuggestions();
}

function renderTabs() {
  document.querySelectorAll('[data-tab]').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === STATE.tab);
  });
}

function renderUpdateBadge() {
  const L = STATE.lang;
  const badge = document.getElementById('update-badge');
  if (!STATE.data) {
    badge.textContent = '—';
    return;
  }
  const date = formatDate(STATE.data.lastUpdated, L);
  const suffix =
    STATE.source === 'cache' ? t(L, 'cachePrefix') : t(L, 'bundlePrefix');
  badge.textContent = `${t(L, 'lastUpdated')}: ${date} ${suffix}`;
}

function renderSuggestions() {
  const L = STATE.lang;
  const list = document.getElementById('suggestions');
  const input = document.getElementById('search-input');
  if (!STATE.data || document.activeElement !== input) {
    list.hidden = true;
    return;
  }
  const q = STATE.query.toLowerCase();
  const cat = STATE.category;
  const matches = STATE.data.items
    .filter((it) => {
      if (cat !== 'all' && it.category !== cat) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      if (STATE.tab === 'resurgence' && !hasResurgentDrop(it)) return false;
      return !STATE.selected.has(it.name);
    })
    .slice(0, 30);

  list.replaceChildren();
  if (matches.length === 0) {
    const li = document.createElement('li');
    li.className = 'suggestion-empty';
    li.textContent = t(L, 'suggestionsEmpty');
    list.appendChild(li);
    list.hidden = false;
    return;
  }
  for (const it of matches) {
    const li = document.createElement('li');
    li.className = 'suggestion';
    li.tabIndex = 0;
    const name = document.createElement('span');
    name.className = 'suggestion-name';
    name.textContent = it.name;
    const catLbl = document.createElement('span');
    catLbl.className = 'suggestion-cat';
    catLbl.textContent = t(L, `category.${it.category}`);
    li.append(name, catLbl);
    li.addEventListener('mousedown', (e) => {
      // mousedown so it fires before input blur hides the list.
      e.preventDefault();
      addItem(it.name);
    });
    list.appendChild(li);
  }
  list.hidden = false;
}

function addItem(name) {
  if (STATE.selected.has(name)) return;
  STATE.selected.set(name, { excludedParts: new Set() });
  document.getElementById('search-input').value = '';
  STATE.query = '';
  renderSuggestions();
  renderMatrix();
}

function removeItem(name) {
  STATE.selected.delete(name);
  renderMatrix();
}

function togglePart(itemName, partName) {
  const sel = STATE.selected.get(itemName);
  if (!sel) return;
  if (sel.excludedParts.has(partName)) sel.excludedParts.delete(partName);
  else sel.excludedParts.add(partName);
  renderMatrix();
}

function renderMatrix() {
  const L = STATE.lang;
  const root = document.getElementById('matrix-root');
  root.replaceChildren();
  if (!STATE.data) return;
  if (STATE.selected.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'matrix-empty';
    empty.textContent = t(L, 'selectedNone');
    root.appendChild(empty);
    return;
  }

  const items = [...STATE.selected.keys()]
    .map((n) => STATE.data.items.find((i) => i.name === n))
    .filter(Boolean);

  const table = document.createElement('table');
  table.className = 'matrix';

  const colgroup = document.createElement('colgroup');
  const tierCol = document.createElement('col');
  tierCol.className = 'col-tier';
  colgroup.appendChild(tierCol);
  for (let i = 0; i < items.length; i++) {
    const c = document.createElement('col');
    c.className = 'col-item';
    colgroup.appendChild(c);
  }
  table.appendChild(colgroup);

  // Header row: item name + parts toggles + remove button.
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className = 'corner';
  headerRow.appendChild(corner);
  for (const item of items) {
    const th = document.createElement('th');
    th.className = 'item-header';

    const top = document.createElement('div');
    top.className = 'item-header-top';

    const itemImageName = safeImageName(item.imageName);
    if (itemImageName) {
      const img = document.createElement('img');
      img.className = 'item-thumb';
      img.src = cdnImageUrl(itemImageName);
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      const fallbackImageUrl = cdnItemImageUrl(item.name);
      img.addEventListener('error', () => {
        if (img.src !== fallbackImageUrl) {
          img.src = fallbackImageUrl;
          return;
        }
        img.remove();
      });
      top.appendChild(img);
    }

    const titleWrap = document.createElement('div');
    titleWrap.className = 'item-title-wrap';
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = item.name;
    titleWrap.append(title);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.title = t(L, 'removeItem');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeItem(item.name));

    top.append(titleWrap, removeBtn);

    const partsBox = document.createElement('div');
    partsBox.className = 'parts-toggles';
    const sel = STATE.selected.get(item.name);
    for (const part of item.parts) {
      const id = `pt-${slug(item.name)}-${slug(part.name)}`;
      const wrap = document.createElement('label');
      wrap.className = 'part-toggle';
      wrap.htmlFor = id;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.checked = !sel.excludedParts.has(part.name);
      cb.addEventListener('change', () => togglePart(item.name, part.name));
      const span = document.createElement('span');
      span.textContent = translatePartName(part.name, L);
      wrap.append(cb, span);
      partsBox.appendChild(wrap);
    }

    th.append(top, partsBox);
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body rows: one per tier.
  const tbody = document.createElement('tbody');
  for (const tier of TIERS) {
    const tr = document.createElement('tr');
    const tierTh = document.createElement('th');
    tierTh.className = `tier-label tier-${tier.toLowerCase()}`;
    const tierIcon = document.createElement('img');
    tierIcon.className = 'tier-icon';
    tierIcon.src = relicTierImageUrl(tier);
    tierIcon.alt = '';
    tierIcon.loading = 'lazy';
    tierIcon.decoding = 'async';
    const tierText = document.createElement('span');
    tierText.textContent = tier;
    tierTh.append(tierIcon, tierText);
    tr.appendChild(tierTh);

    for (const item of items) {
      const td = document.createElement('td');
      td.className = 'cell';
      const sel = STATE.selected.get(item.name);
      const lines = [];
      for (const part of item.parts) {
        if (sel.excludedParts.has(part.name)) continue;
        for (const drop of part.drops[tier] ?? []) {
          if (STATE.tab === 'unvaulted' && drop.vaulted) continue;
          if (STATE.tab === 'vaulted' && !drop.vaulted) continue;
          const fullRelicKey = `${tier} ${drop.relic}`;
          const isResurgent = STATE.resurgentRelics.has(fullRelicKey);
          if (STATE.tab === 'resurgence' && !isResurgent) continue;
          lines.push({
            part: part.name,
            partImageName: part.imageName,
            isResurgent,
            ...drop,
          });
        }
      }
      lines.sort((a, b) => {
        const ra = rarityRank(a.rarity);
        const rb = rarityRank(b.rarity);
        if (ra !== rb) return ra - rb;
        return a.relic.localeCompare(b.relic);
      });
      if (lines.length === 0) {
        td.textContent = t(L, 'noDrops');
        td.classList.add('empty');
      } else {
        for (const line of lines) {
          const row = document.createElement('div');
          row.className = `relic-line ${RARITY_CLASS[line.rarity] ?? ''}`;
          if (line.vaulted) row.classList.add('vaulted');
          const code = document.createElement('span');
          code.className = 'relic-code';
          code.textContent = line.relic;
          row.appendChild(code);
          if (line.isResurgent) {
            const ayaIcon = document.createElement('img');
            ayaIcon.className = 'aya-icon';
            ayaIcon.src = ayaIconUrl();
            ayaIcon.alt = '';
            ayaIcon.title = t(L, 'resurgenceAvailable');
            ayaIcon.loading = 'lazy';
            ayaIcon.decoding = 'async';
            row.appendChild(ayaIcon);
          }
          const partName = document.createElement('span');
          partName.className = 'relic-part';
          partName.textContent = translatePartName(line.part, L);
          row.appendChild(partName);
          td.appendChild(row);
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);
}

// ---------- helpers ----------

function hasResurgentDrop(item) {
  if (STATE.resurgentRelics.size === 0) return false;
  for (const part of item.parts) {
    for (const tier of TIERS) {
      for (const drop of part.drops[tier] ?? []) {
        if (STATE.resurgentRelics.has(`${tier} ${drop.relic}`)) return true;
      }
    }
  }
  return false;
}

function rarityRank(r) {
  return r === 'Rare' ? 0 : r === 'Uncommon' ? 1 : 2;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function formatDate(iso, lang) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function showStatus(msg, isError) {
  const el = document.getElementById('status-message');
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
  el.hidden = false;
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => { el.hidden = true; }, 3500);
}
