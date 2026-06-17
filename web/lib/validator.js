// English-likeness scoring + typo correction. Ported from validator.py,
// including the SymSpell deletion index that replaces the O(20k) per-token scan.
// WORDS maps each of the top 20k English words to its zipf frequency.

import WORDS from "./words.js";

const wordSet = new Set(Object.keys(WORDS)); // membership; avoids prototype keys

function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const cur = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] !== b[j - 1] ? 1 : 0));
      prev = cur;
    }
  }
  return dp[n];
}

function deletes1(w) {
  const s = new Set();
  for (let i = 0; i < w.length; i++) s.add(w.slice(0, i) + w.slice(i + 1));
  return s;
}

// Built once per cold start: each word AND its delete-1 forms -> producing words.
const deleteIndex = new Map();
for (const w of wordSet) {
  const add = (k) => {
    let set = deleteIndex.get(k);
    if (!set) deleteIndex.set(k, (set = new Set()));
    set.add(w);
  };
  add(w);
  for (const d of deletes1(w)) add(d);
}

function neighbors1(word) {
  const keys = new Set([word, ...deletes1(word)]);
  const cand = new Set();
  for (const k of keys) {
    const set = deleteIndex.get(k);
    if (set) for (const w of set) cand.add(w);
  }
  // Verify the real distance: delete collisions yield false positives.
  return [...cand].filter((w) => lev(word, w) === 1);
}

// Cartesian product of per-token choices, capped to avoid combinatorial
// blow-up on long garbage decodings (each token can offer up to 5 options, so
// an N-token string is 5^N combinations). Correct decodings yield exact words
// -> one choice per token -> product of 1, so the cap never affects real hits.
// Choices are pre-sorted best-first, so the retained combinations are the
// most likely ones, starting with the all-top-choice sentence.
const MAX_COMBINATIONS = 2000;

function product(arrays) {
  let acc = [[]];
  for (const arr of arrays) {
    const next = [];
    outer: for (const a of acc) {
      for (const x of arr) {
        next.push([...a, x]);
        if (next.length >= MAX_COMBINATIONS) break outer;
      }
    }
    acc = next;
  }
  return acc;
}

export function scoreSentence(sentence) {
  const tokens = sentence.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return -Infinity;
  const real = tokens.filter((w) => wordSet.has(w));
  if (real.length === 0) return -Infinity;
  let score = real.length * 20;
  for (const w of real) score += WORDS[w];
  score -= (tokens.length - real.length) * 10;
  if (real.length / tokens.length < 0.5) score -= 50;
  return score;
}

function generateVersions(sentence) {
  const tokens = sentence.toLowerCase().split(/\s+/).filter(Boolean);
  const choices = [];
  for (const word of tokens) {
    if (wordSet.has(word)) { choices.push([word]); continue; }
    let possible = neighbors1(word);
    if (possible.length === 0) possible = [word];
    possible.sort((a, b) => (WORDS[b] ?? 0) - (WORDS[a] ?? 0));
    choices.push(possible.slice(0, 5));
  }
  return product(choices).map((c) => c.join(" "));
}

// How many of the most promising decodings to run full typo-correction on.
const CORRECT_TOP_K = 5;

// Cheap proxy: score a decoding as if punctuation were stripped, since
// correction can delete a stray comma/period (a distance-1 edit). Used only to
// pick which decodings are worth the expensive correction pass.
function rawProxy(sentence) {
  const tokens = sentence.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return -Infinity;
  let real = 0, zsum = 0;
  for (const t of tokens) {
    const clean = t.replace(/[^a-z]/g, "");
    if (wordSet.has(clean)) { real++; zsum += WORDS[clean]; }
  }
  if (real === 0) return -Infinity;
  let score = real * 20 + zsum - (tokens.length - real) * 10;
  if (real / tokens.length < 0.5) score -= 50;
  return score;
}

export function validate(encodedMessages) {
  // Rank decodings by the cheap proxy and keep only the top few; running full
  // correction on every brute-force candidate is what made long inputs explode.
  const ranked = encodedMessages
    .map((msg) => [rawProxy(msg), msg])
    .filter(([p]) => p > -Infinity)
    .sort((a, b) => b[0] - a[0])
    .slice(0, CORRECT_TOP_K);

  let best = null, bestScore = -Infinity;
  for (const [, msg] of ranked) {
    const raw = scoreSentence(msg); // correction may not improve on the raw form
    if (raw > bestScore) { bestScore = raw; best = msg; }
    for (const cand of generateVersions(msg)) {
      const s = scoreSentence(cand);
      if (s > bestScore) { bestScore = s; best = cand; }
    }
  }
  return best;
}
