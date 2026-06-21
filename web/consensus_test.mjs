// Hypothesis: when two ciphers agree on the same decoding, that consensus
// answer is more often correct than the single top-scored answer.
// Test on simple two-word phrases encrypted with known ciphers/keys.
import { crack } from "./lib/solver.js";
import { ref, pos } from "./lib/ciphers.js";

const enc = {
  caesar: (s, k) => [...s].map((l) => (l in pos ? ref[(pos[l] + k) % 26] : l)).join(""),
  atbash: (s) => [...s].map((l) => (l in pos ? ref[25 - pos[l]] : l)).join(""),
  affine: (s, a, b) => [...s].map((l) => (l in pos ? ref[(a * pos[l] + b) % 26] : l)).join(""),
  rail: (s, rails) => {
    const pattern = [];
    let r = 0, step = 1;
    for (let i = 0; i < s.length; i++) { pattern.push(r); if (r === 0) step = 1; else if (r === rails - 1) step = -1; r += step; }
    const rows = Array.from({ length: rails }, () => []);
    for (let i = 0; i < s.length; i++) rows[pattern[i]].push(s[i]);
    return rows.map((x) => x.join("")).join("");
  },
};

const phrases = [
  "good morning", "thank you", "hello world", "ice cream", "happy birthday",
  "black coffee", "open door", "blue sky", "red apple", "high school",
  "cold water", "free time", "old friend", "white house", "long time",
  "best friend", "hot dog", "full moon", "fresh air", "big city",
];

enc.vig = (s, key) => {
  const k = [...key].map((c) => pos[c]);
  let j = 0, o = "";
  for (const l of s) { if (l in pos) { o += ref[(pos[l] + k[j % k.length]) % 26]; j++; } else o += l; }
  return o;
};

// Each test case: a ciphertext + the true plaintext + how it was made.
const cases = [];
for (const p of phrases) {
  for (const k of [3, 7, 13, 20]) cases.push([enc.caesar(p, k), p, `caesar/${k}`]);
  cases.push([enc.atbash(p), p, "atbash"]);
  for (const [a, b] of [[3, 1], [5, 7], [7, 4], [11, 9]]) cases.push([enc.affine(p, a, b), p, `affine/${a},${b}`]);
  for (const rails of [2, 3]) cases.push([enc.rail(p, rails), p, `rail/${rails}`]);
}

// Long messages: where the correct top usually scores very high. The margin
// rule must NOT let a low-scoring substitution-bloc consensus override these.
const longs = [
  "the quick brown fox jumps over the lazy dog by the river",
  "she sells sea shells down by the old sandy sea shore today",
  "we will meet at the train station before the sun comes up",
];
for (const p of longs) {
  cases.push([enc.caesar(p, 5), p, "caesarL"]);
  cases.push([enc.affine(p, 3, 1), p, "affineL"]);
  cases.push([enc.rail(p, 3), p, "railL"]);
  cases.push([enc.vig(p, "lemon"), p, "vigL"]);
}

// Best-scoring decoding that >=2 methods produced, with its score.
function consensus(ranked) {
  const counts = new Map();
  for (const c of ranked) if (c.text) counts.set(c.text, (counts.get(c.text) || 0) + 1);
  let text = null, score = -Infinity;
  for (const c of ranked) {
    const sc = c.score == null ? -Infinity : c.score;
    if ((counts.get(c.text) || 0) >= 2 && sc > score) { score = sc; text = c.text; }
  }
  return { text, score };
}

// Precompute crack() once per case (it's the slow part).
const solved = cases.map(([ct, plain, how]) => {
  const { best, ranked } = crack(ct);
  return { plain, how, best, cons: consensus(ranked) };
});

// Strategy: prefer the agreed answer only if it scores within margin M of the
// top (a near-tie that the agreement breaks). M = -1 means "top only".
function evaluate(M) {
  const tally = {};
  let right = 0, regress = 0;
  for (const { plain, how, best, cons } of solved) {
    const topScore = best.score == null ? -Infinity : best.score;
    const useCons = M >= 0 && cons.text !== null && cons.score >= topScore - M;
    const pick = useCons ? cons.text : best.text;
    const ok = pick === plain;
    right += ok;
    if (best.text === plain && !ok) regress++; // top was right, rule broke it
    const fam = how.replace(/\/.*/, "");
    tally[fam] ??= { n: 0, ok: 0 };
    tally[fam].n++; tally[fam].ok += ok;
  }
  return { right, regress, tally };
}

const pct = (a, b) => (100 * a / b).toFixed(0) + "%";
const fams = Object.keys(evaluate(-1).tally);
console.log(`cases: ${cases.length}\n`);
console.log(["margin    ", ...fams.map((f) => f.padStart(8)), "OVERALL", "regress"].join("  "));
for (const M of [-1, 0, 5, 10, 15, 20, 30, 50]) {
  const { right, regress, tally } = evaluate(M);
  const label = M < 0 ? "top-only  " : ("M=" + M).padEnd(10);
  console.log([label, ...fams.map((f) => pct(tally[f].ok, tally[f].n).padStart(8)), pct(right, cases.length).padStart(7), String(regress).padStart(7)].join("  "));
}
