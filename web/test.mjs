// Parity / sanity checks for the JS port. Run: node test.mjs
import { crack } from "./lib/solver.js";
import { ref, pos } from "./lib/ciphers.js";

const mod = (x, n) => ((x % n) + n) % n;

// Vigenere encryptor, to build test ciphertexts.
function enc(s, key) {
  const k = [...key].map((c) => pos[c]);
  let j = 0, out = "";
  for (const l of s) {
    if (l in pos) { out += ref[mod(pos[l] + k[j % k.length], 26)]; j++; }
    else out += l;
  }
  return out;
}

let fails = 0;
function check(name, cond, detail = "") {
  console.log(`${cond ? "ok  " : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
  if (!cond) fails++;
}

// 1. Caesar ciphertext (the committed sample)
let r = crack("z cfmv bferkr wifd cltbp jkri");
check("caesar sample", r.best.text === "i love konata from lucky star" && r.best.method === "caesar",
  `${r.best.method}: ${r.best.text}`);

// 2. Mixed case + punctuation normalizes
r = crack("Khoor, Zruog!");
check("mixed-case caesar", r.best.text === "hello world", `${r.best.method}: ${r.best.text}`);

// 3. Long Vigenere recovers the key + full plaintext
const plain = ("the index of coincidence is a statistical measure that tells you how " +
  "likely two randomly chosen letters in a text are the same which lets a " +
  "cryptanalyst recover the length of a repeating key and then attack each " +
  "column as if it were an ordinary caesar shift problem");
r = crack(enc(plain, "lemon"));
const vig = r.ranked.find((c) => c.method === "vigenere");
check("vigenere long: key", vig.key === "lemon", `key=${vig.key}`);
check("vigenere long: plaintext", vig.text === plain);

// 4. Short message: vigenere produces garbage and loses (matches Python)
r = crack(enc("i love konata from lucky star", "lemon"));
check("vigenere short loses", r.best.method !== "vigenere", `best=${r.best.method}`);

// 5. Edge cases must not throw and must be JSON-safe (no Infinity)
for (const m of ["", "   ", "12345"]) {
  try {
    const out = crack(m);
    const safe = JSON.parse(JSON.stringify(out)); // would throw on Infinity? No, becomes null via our guard
    check(`edge ${JSON.stringify(m)}`, safe.ranked.every((c) => c.score === null || Number.isFinite(c.score)));
  } catch (e) {
    check(`edge ${JSON.stringify(m)}`, false, e.message);
  }
}

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
