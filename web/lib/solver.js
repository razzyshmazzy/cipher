// Shared cracking logic, used by the API function and the test harness.
// Ported from solver.py.

import { caesar, atbash, affine, railFence } from "./ciphers.js";
import { validate, scoreSentence } from "./validator.js";
import { vigenereCrack } from "./vigenere.js";

const BRUTE_FORCE = { caesar, atbash, affine, rail_fence: railFence };

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

  // JSON has no representation for -Infinity; expose unscored as null.
  for (const c of candidates) if (!Number.isFinite(c.score)) c.score = null;

  return { input: ciphertext, best: candidates[0], ranked: candidates };
}
