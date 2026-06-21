// Shared cracking logic, used by the API function and the test harness.
// Ported from solver.py.

import { caesar, atbash, affine, railFence } from "./ciphers.js";
import { validate, scoreSentence } from "./validator.js";
import { vigenereCrack } from "./vigenere.js";

const BRUTE_FORCE = { caesar, atbash, affine, rail_fence: railFence };

// When two methods independently produce the same decoding, that agreement is
// strong evidence it's real — the single top scorer is sometimes a different
// cipher's lucky English. But only trust it as a near-tie tiebreak: the agreed
// answer must score within this margin of the top, or a structural bloc (affine
// contains caesar/atbash, so they always agree on *some* decode) would override
// genuinely-better single answers on e.g. rail-fence inputs.
const CONSENSUS_MARGIN = 15;

function candidate(method, text, key = null) {
  text = text || ""; // validate() can return null when nothing scored
  return { method, text, key, score: scoreSentence(text) };
}

export function crack(ciphertext) {
  // Ciphers only operate on lowercase letters; normalize so capitals don't
  // decode as garbage.
  const text = ciphertext.toLowerCase();

  const candidates = [];
  for (const [name, cipher] of Object.entries(BRUTE_FORCE)) {
    candidates.push(candidate(name, validate(cipher(text))));
  }

  const [vigText, vigKey] = vigenereCrack(text);
  candidates.push(candidate("vigenere", vigText, vigKey));

  // Explicit compare: subtracting -Infinity scores would yield NaN.
  candidates.sort((a, b) => (a.score === b.score ? 0 : a.score > b.score ? -1 : 1));

  // Consensus tiebreak: highest-scoring decoding that >=2 methods produced and
  // that lands within CONSENSUS_MARGIN of the top score. Candidates are sorted
  // best-first, so the first qualifier is the highest-scoring one.
  const counts = new Map();
  for (const c of candidates) if (c.text) counts.set(c.text, (counts.get(c.text) || 0) + 1);
  const topScore = candidates[0].score;
  let best = candidates[0];
  for (const c of candidates) {
    if ((counts.get(c.text) || 0) >= 2 && Number.isFinite(c.score) && c.score >= topScore - CONSENSUS_MARGIN) {
      best = c;
      break;
    }
  }

  // JSON has no representation for -Infinity; expose unscored as null.
  for (const c of candidates) if (!Number.isFinite(c.score)) c.score = null;

  return { input: ciphertext, best, ranked: candidates };
}
