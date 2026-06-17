// Brute-forceable ciphers. Each returns an array of candidate decodings.
// Ported from ciphers.py; non-letters pass through unchanged.

const ref = "abcdefghijklmnopqrstuvwxyz";
export const pos = Object.fromEntries([...ref].map((c, i) => [c, i]));
export { ref };

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function caesar(s) {
  const out = [];
  for (let shift = 0; shift < 26; shift++) {
    let t = "";
    for (const l of s) t += l in pos ? ref[(pos[l] + shift) % 26] : l;
    out.push(t);
  }
  return out;
}

export function atbash(s) {
  let t = "";
  for (const l of s) t += l in pos ? ref[25 - pos[l]] : l;
  return [t];
}

export function affine(s) {
  const out = [];
  const validA = [];
  for (let a = 1; a < 26; a++) if (gcd(a, 26) === 1) validA.push(a);
  for (const a of validA) {
    for (let b = 0; b < 26; b++) {
      let t = "";
      for (const l of s) t += l in pos ? ref[(a * pos[l] + b) % 26] : l;
      out.push(t);
    }
  }
  return out;
}

export function railFence(s) {
  const out = [];
  const top = Math.max(3, s.length);
  for (let rails = 2; rails < top; rails++) out.push(railDecode(s, rails));
  return out;
}

function railDecode(s, rails) {
  const n = s.length;
  if (rails < 2 || rails >= n) return s;

  const pattern = [];
  let r = 0, step = 1;
  for (let i = 0; i < n; i++) {
    pattern.push(r);
    if (r === 0) step = 1;
    else if (r === rails - 1) step = -1;
    r += step;
  }

  const counts = [];
  for (let rr = 0; rr < rails; rr++) counts.push(pattern.filter((x) => x === rr).length);

  const rows = [];
  let idx = 0;
  for (const c of counts) { rows.push([...s.slice(idx, idx + c)]); idx += c; }

  const pointers = new Array(rails).fill(0);
  let result = "";
  for (const rr of pattern) result += rows[rr][pointers[rr]++];
  return result;
}
