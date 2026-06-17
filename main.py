from ciphers import caesar, atbash, affine, rail_fence
from validator import validate, score_sentence
from vigenere_crack import vigenere_crack

# Ciphertext to crack. We don't know which cipher produced it, so try every
# brute-forceable one and let the scorer decide which decoding is real English.
ciphertext = "z cfmv bferkr wifd cltbp jkri"

# Keyless / bounded-keyspace ciphers. Each returns all candidate decodings.
# (vigenere is excluded: it needs a key, so it can't be brute-forced blindly.)
ciphers = {
    "caesar": caesar,
    "atbash": atbash,
    "affine": affine,
    "rail_fence": rail_fence,
}

results = []
for name, cipher in ciphers.items():
    best = validate(cipher(ciphertext))
    results.append((score_sentence(best), name, best))

results.sort(reverse=True)

winner_score, winner_cipher, winner_text = results[0]
print(f"Best guess: {winner_text!r}  (via {winner_cipher})\n")

print("Ranked by cipher:")
for score, name, sentence in results:
    print(f"  {score:7.2f}  {name:<10}  {sentence}")

# Vigenere can't be brute-forced blindly, so it runs as a separate statistical
# step that returns one finished answer plus the recovered key. On short inputs
# it scores poorly and correctly loses to the brute-forced ciphers above.
vig_text, vig_key = vigenere_crack(ciphertext)
print(f"\nVigenere (statistical): {vig_text!r}  key={vig_key!r}  "
      f"score={score_sentence(vig_text):.2f}")