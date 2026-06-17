# vigenere_crack.py
# Statistical break for Vigenere: index of coincidence finds the key length,
# chi-squared frequency analysis solves each column as an independent Caesar.
# Needs a reasonable amount of ciphertext (~100+ letters) to be reliable.
#
# This is a *solver*, not an encoder: it returns one finished answer plus the
# recovered key, so it deliberately does NOT match the cipher(s) -> [candidates]
# shape that ciphers.py and validate() are built around. Kept stdlib-only so it
# stays a standalone tool with no dependency on the scoring stack.

import string
from collections import Counter

ref = string.ascii_lowercase
pos = {c: i for i, c in enumerate(ref)}

ENGLISH_FREQ = {
    'a':.08167,'b':.01492,'c':.02782,'d':.04253,'e':.12702,'f':.02228,
    'g':.02015,'h':.06094,'i':.06966,'j':.00153,'k':.00772,'l':.04025,
    'm':.02406,'n':.06749,'o':.07507,'p':.01929,'q':.00095,'r':.05987,
    's':.06327,'t':.09056,'u':.02758,'v':.00978,'w':.02360,'x':.00150,
    'y':.01974,'z':.00074,
}


def _ioc(text):
    n = len(text)
    if n < 2:
        return 0.0
    counts = Counter(text)
    return sum(c * (c - 1) for c in counts.values()) / (n * (n - 1))


def _key_length(letters, max_len=12):
    scores = []
    for L in range(1, max_len + 1):
        cols = [letters[i::L] for i in range(L)]
        scores.append((L, sum(_ioc(col) for col in cols) / L))
    # Smallest length whose average IoC looks English-like (~0.067);
    # fall back to the best-scoring length if none clear the threshold.
    # NB: taking the *smallest* over-threshold length is what keeps a true
    # period of 5 from being reported as its double (10 also scores high, but
    # its shorter columns recover a noisier key, e.g. "lesocleqon" vs "leqon").
    for L, ioc in scores:
        if ioc >= 0.06:
            return L
    return max(scores, key=lambda x: x[1])[0]


def _best_shift(column):
    best_shift, best_chi = 0, float("inf")
    n = len(column)
    for shift in range(26):
        counts = Counter((pos[c] - shift) % 26 for c in column)
        chi = sum(
            (counts.get(i, 0) - ENGLISH_FREQ[ref[i]] * n) ** 2 / (ENGLISH_FREQ[ref[i]] * n)
            for i in range(26)
        )
        if chi < best_chi:
            best_chi, best_shift = chi, shift
    return best_shift


def vigenere_crack(s, max_len=12):
    """Returns (decoded_text, recovered_key)."""
    letters = [l for l in s.lower() if l in pos]
    L = _key_length(letters, max_len)
    cols = [letters[i::L] for i in range(L)]
    key = [_best_shift(col) for col in cols]

    j, out = 0, []
    for l in s:
        if l in pos:
            out.append(ref[(pos[l] - key[j % L]) % 26])
            j += 1
        else:
            out.append(l)
    return "".join(out), "".join(ref[k] for k in key)
