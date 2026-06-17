# Cipher

**Input:** an encoded ciphertext. **Output:** the original sentence (hopefully).

Cipher takes a message encrypted with an unknown classical cipher, tries every
one it knows, scores each decoding for how English-like it is, and returns the
best guess. It's a website and an API.

## How it works

For a given ciphertext it runs:

| method       | approach                                                        | key? |
|--------------|-----------------------------------------------------------------|------|
| `caesar`     | brute-force all 26 shifts                                       | no   |
| `atbash`     | single fixed substitution                                       | no   |
| `affine`     | brute-force all valid `(a, b)` keys                             | no   |
| `rail_fence` | brute-force all rail counts                                    | no   |
| `vigenere`   | statistical break: index of coincidence + chi-squared analysis | yes  |

Each candidate decoding is scored against a 20k-word English frequency list
(with single-edit typo correction), and the highest scorer wins. The Vigenère
break needs ~100+ letters to be reliable; on short inputs it scores poorly and
loses to the keyless ciphers, which is the correct outcome.

## API

Base URL is your deployment origin. Two ways to call `/api/crack`:

### `GET /api/crack`

Pass the ciphertext as a query parameter — works with a plain `curl`, no body.

```bash
curl "https://<deployment>/api/crack?message=z%20cfmv%20bferkr%20wifd%20cltbp%20jkri"
```

### `POST /api/crack`

Pass it as JSON.

```bash
curl -X POST https://<deployment>/api/crack \
  -H 'content-type: application/json' \
  -d '{"message": "z cfmv bferkr wifd cltbp jkri"}'
```

### Request

| field     | type   | description                  |
|-----------|--------|------------------------------|
| `message` | string | the ciphertext to crack      |

### Response `200`

```json
{
  "input": "z cfmv bferkr wifd cltbp jkri",
  "best": {
    "method": "caesar",
    "text": "i love konata from lucky star",
    "key": null,
    "score": 119.5
  },
  "ranked": [
    { "method": "caesar",     "text": "i love konata from lucky star", "key": null,      "score": 119.5 },
    { "method": "affine",     "text": "i love konata from lucky star", "key": null,      "score": 119.5 },
    { "method": "rail_fence", "text": "zcvfrrwf lb kirjptcdi ke f mb",  "key": null,      "score": 76.29 },
    { "method": "atbash",     "text": "a june yuvipi drug xogyk qpir", "key": null,      "score": 47.44 },
    { "method": "vigenere",   "text": "d einn teitns oaeh eouth iotl", "key": "wyxziib", "score": -74.54 }
  ]
}
```

Scores are raw floats and aren't rounded in the actual response (e.g. the
Vigenère score above is `-74.53999999999999`); `null` appears only when a
decoding contains no real words.

| field             | type           | description                                             |
|-------------------|----------------|---------------------------------------------------------|
| `input`           | string         | the message as submitted                                |
| `best`            | object         | the top-ranked candidate (same shape as a `ranked` row) |
| `ranked`          | array          | all candidates, sorted best-first                       |
| `ranked[].method` | string         | one of `caesar`, `atbash`, `affine`, `rail_fence`, `vigenere` |
| `ranked[].text`   | string         | the decoded message                                     |
| `ranked[].key`    | string \| null | recovered key (Vigenère only; `null` for keyless ciphers) |
| `ranked[].score`  | number \| null | English-likeness score; `null` when no real words were found |

### Errors

| status | when                                   | body                                      |
|--------|----------------------------------------|-------------------------------------------|
| `400`  | `message` is not a string              | `{ "error": "message must be a string" }` |
| `405`  | method other than `GET` or `POST`      | `{ "error": "method not allowed" }`       |

## Web UI

`GET /` serves a text box: paste a ciphertext, hit **Crack it** (or ⌘/Ctrl+Enter)
and the best decoding plus the full ranking are shown.

## Development & deployment

The app lives in [`web/`](web/) — see [`web/README.md`](web/README.md) for the
file layout, local dev (`node test.mjs`, `npx vercel dev`), and Vercel deploy
notes (set the project Root Directory to `web`).

Have fun cracking.