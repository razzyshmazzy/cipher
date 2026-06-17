# Cipher cracker (web)

All-JavaScript cipher cracker: a static text-box UI plus a serverless `/api/crack`
endpoint. Given an unknown ciphertext, it tries Caesar, Atbash, affine, rail-fence,
and a statistical Vigenère break, scores each decoding for English-likeness, and
returns the best one.

## Layout

```
web/
  index.html        text-box UI (served at /)
  api/crack.js       serverless function -> /api/crack
  lib/
    ciphers.js       caesar / atbash / affine / rail_fence
    vigenere.js      statistical Vigenère break (IoC + chi-squared)
    validator.js     English scoring + SymSpell typo correction
    solver.js        crack(): runs everything, ranks by score
    words.js         top 20k English words + zipf frequencies (generated)
  test.mjs           parity / sanity checks
```

## Use it

```bash
# query param (plain curl, no body)
curl "https://<your-deployment>/api/crack?message=z%20cfmv%20bferkr%20wifd%20cltbp%20jkri"

# JSON body
curl -X POST https://<your-deployment>/api/crack \
  -H 'content-type: application/json' \
  -d '{"message": "Khoor, Zruog!"}'
```

Response: `{ input, best, ranked }`, where each entry is `{ method, text, key, score }`
(`score` is `null` when a decoding has no real words).

## Develop / test

```bash
node test.mjs          # parity checks against known results
npx vercel dev         # run the UI + function locally at http://localhost:3000
```

## Deploy (Vercel)

This app lives in the `web/` subdirectory, so set the project's **Root Directory**
to `web` (Vercel dashboard → Project → Settings → General), or run `vercel` from
inside `web/`. No build step or env vars are required — static files are served at
`/` and `api/crack.js` becomes `/api/crack` automatically.

The structure ports cleanly to Cloudflare Pages or Netlify if you switch hosts;
only the function entry point (`api/crack.js`) needs adapting.

## Regenerating the wordlist

`lib/words.js` is exported from Python's `wordfreq` so the JS scorer matches the
original implementation. To regenerate (requires `pip install wordfreq`):

```python
import json
from wordfreq import top_n_list, zipf_frequency
d = {w: round(zipf_frequency(w, "en"), 3) for w in top_n_list("en", 20000)}
with open("lib/words.js", "w", encoding="utf-8") as f:
    f.write("export default ")
    json.dump(d, f, ensure_ascii=False)
    f.write(";\n")
```
