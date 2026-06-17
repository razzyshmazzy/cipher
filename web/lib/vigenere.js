// Statistical Vigenere break: index of coincidence finds the key length,
// chi-squared frequency analysis solves each column as a Caesar shift.
// Ported from vigenere_crack.py. Needs ~100+ letters to be reliable.

import { ref, pos } from "./ciphers.js";

const ENGLISH_FREQ = {
  a: 0.08167, b: 0.01492, c: 0.02782, d: 0.04253, e: 0.12702, f: 0.02228,
  g: 0.02015, h: 0.06094, i: 0.06966, j: 0.00153, k: 0.00772, l: 0.04025,
  m: 0.02406, n: 0.06749, o: 0.07507, p: 0.01929, q: 0.00095, r: 0.05987,
  s: 0.06327, t: 0.09056, u: 0.02758, v: 0.00978, w: 0.02360, x: 0.00150,
  y: 0.01974, z: 0.00074,
};

const mod = (x, n) => ((x % n) + n) % n; // JS % can be negative; Python's isn't

function column(letters, i, L) {
  const col = [];
  for (let k = i; k < letters.length; k += L) col.push(letters[k]);
  return col;
}

function ioc(text) {
  const n = text.length;
  if (n < 2) return 0;
  const counts = {};
  for (const c of text) counts[c] = (counts[c] || 0) + 1;
  let s = 0;
  for (const k in counts) s += counts[k] * (counts[k] - 1);
  return s / (n * (n - 1));
}

function keyLength(letters, maxLen = 12) {
  const scores = [];
  for (let L = 1; L <= maxLen; L++) {
    let tot = 0;
    for (let i = 0; i < L; i++) tot += ioc(column(letters, i, L));
    scores.push([L, tot / L]);
  }
  // Smallest length whose averaged IoC looks English-like (~0.067); this is
  // what keeps a true period from being reported as its double. Fall back to
  // the best-scoring length if none clear the threshold.
  for (const [L, v] of scores) if (v >= 0.06) return L;
  let best = scores[0];
  for (const sc of scores) if (sc[1] > best[1]) best = sc;
  return best[0];
}

function bestShift(col) {
  let shiftBest = 0, chiBest = Infinity;
  const n = col.length;
  for (let shift = 0; shift < 26; shift++) {
    const counts = {};
    for (const c of col) {
      const v = mod(pos[c] - shift, 26);
      counts[v] = (counts[v] || 0) + 1;
    }
    let chi = 0;
    for (let i = 0; i < 26; i++) {
      const e = ENGLISH_FREQ[ref[i]] * n;
      const o = counts[i] || 0;
      chi += ((o - e) ** 2) / e;
    }
    if (chi < chiBest) { chiBest = chi; shiftBest = shift; }
  }
  return shiftBest;
}

// Returns [decodedText, recoveredKey].
export function vigenereCrack(s, maxLen = 12) {
  const letters = [...s.toLowerCase()].filter((l) => l in pos);
  if (letters.length === 0) return [s, ""];

  const L = keyLength(letters, maxLen);
  const key = [];
  for (let i = 0; i < L; i++) key.push(bestShift(column(letters, i, L)));

  let j = 0, out = "";
  for (const l of s) {
    if (l in pos) { out += ref[mod(pos[l] - key[j % L], 26)]; j++; }
    else out += l;
  }
  return [out, key.map((k) => ref[k]).join("")];
}
