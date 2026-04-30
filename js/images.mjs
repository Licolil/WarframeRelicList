import { WARFRAME_ITEMS_CDN_BASE } from './upstream.mjs';

export const IMAGE_BASE_URL = `${WARFRAME_ITEMS_CDN_BASE}/data/img/`;

export function cdnImageUrl(imageName) {
  return new URL(imageName, IMAGE_BASE_URL).href;
}

export function cdnItemImageUrl(itemName) {
  return cdnImageUrl(`${itemName.replace(/[^A-Za-z0-9]/g, '')}.png`);
}

export function relicTierImageUrl(tier) {
  return cdnImageUrl(`Relic${tier}A.png`);
}

export function ayaIconUrl() {
  return cdnImageUrl('Aya.png');
}
