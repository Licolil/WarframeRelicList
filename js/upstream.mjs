// Avoid a literal at-sign in served source; some CDN transforms treat
// email-like text aggressively.
const REF_SEPARATOR = String.fromCharCode(64);

export const WARFRAME_ITEMS_CDN_BASE =
  `https://cdn.jsdelivr.net/gh/WFCD/warframe-items${REF_SEPARATOR}master`;
