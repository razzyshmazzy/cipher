# Each returns all possible combinations

import string
from math import gcd

ref = string.ascii_lowercase
pos = {c: i for i, c in enumerate(ref)}

def caesar(s):
    czar = []

    for shift in range(26):
        temp = ""
        for l in s:
            if l == " ":
                temp += l
                continue

            if ref.index(l) + shift >= len(ref):
                l = ref[ref.index(l) - 26 + shift]
            else:
                l = ref[ref.index(l) + shift]
            temp+=l
        czar.append(temp)

    return czar

def atbash(s):
    return ["".join(ref[25 - pos[l]] if l in pos else l for l in s)]


def affine(s):
    out = []
    valid_a = [a for a in range(1, 26) if gcd(a, 26) == 1]
    for a in valid_a:
        for b in range(26):
            temp = "".join(ref[(a * pos[l] + b) % 26] if l in pos else l for l in s)
            out.append(temp)
    return out

def rail_fence(s):
    out = []
    n = len(s)
    for rails in range(2, max(3, n)):
        out.append(_rail_decode(s, rails))
    return out


def _rail_decode(s, rails):
    n = len(s)
    if rails < 2 or rails >= n:
        return s
    
    pattern = []
    r, step = 0, 1
    for _ in range(n):
        pattern.append(r)
        if r == 0:
            step = 1
        elif r == rails - 1:
            step = -1
        r += step

    counts = [pattern.count(r) for r in range(rails)]
    rows, idx = [], 0
    for c in counts:
        rows.append(list(s[idx:idx + c]))
        idx += c

    pointers = [0] * rails
    result = []
    for r in pattern:
        result.append(rows[r][pointers[r]])
        pointers[r] += 1
    return "".join(result)


# keyed, basically impossible brute force

def vigenere(s, key):
    out, k = [], [pos[c] for c in key.lower() if c in pos]
    if not k:
        return [s]
    j = 0
    for l in s:
        if l in pos:
            out.append(ref[(pos[l] - k[j % len(k)]) % 26])
            j += 1
        else:
            out.append(l)
    return ["".join(out)]