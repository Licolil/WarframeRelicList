#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cdnImageUrl, cdnItemImageUrl, relicTierImageUrl } from '../js/images.mjs';

const BASE = 'https://cdn.jsdelivr.net/gh/WFCD/warframe-items' + String.fromCharCode(64) + 'master/data/img';

assert.equal(
  cdnImageUrl('volt-prime-dd65a6befd.png'),
  `${BASE}/volt-prime-dd65a6befd.png`
);

assert.equal(
  cdnImageUrl('cobra-&-crane-prime-bbca3fff77.png'),
  `${BASE}/cobra-&-crane-prime-bbca3fff77.png`
);

assert.equal(
  cdnItemImageUrl('Volt Prime'),
  `${BASE}/VoltPrime.png`
);

assert.equal(
  cdnItemImageUrl('Cobra & Crane Prime'),
  `${BASE}/CobraCranePrime.png`
);

assert.equal(
  relicTierImageUrl('Lith'),
  `${BASE}/RelicLithA.png`
);

assert.equal(
  relicTierImageUrl('Axi'),
  `${BASE}/RelicAxiA.png`
);

console.log('image URL tests passed');
