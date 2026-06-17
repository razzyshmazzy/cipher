from itertools import product
from wordfreq import top_n_list, zipf_frequency
import Levenshtein

words = set(top_n_list("en", 20000))


def generate_versions(sentence):
    tokens = sentence.lower().split()
    choices = []

    for word in tokens:

        if word in words:
            choices.append([word])
            continue

        possible = []

        for w in words:
            if abs(len(w) - len(word)) <= 1:
                if Levenshtein.distance(word, w) == 1:
                    possible.append(w)

        if not possible:
            possible = [word]

        possible = sorted(
            possible,
            key=lambda w: zipf_frequency(w, "en"),
            reverse=True
        )[:5]

        choices.append(possible)

    return [" ".join(c) for c in product(*choices)]

def score_sentence(sentence):
    tokens = sentence.split()
    if not tokens:
        return float("-inf")

    real = [w for w in tokens if w in words]
    if not real:
        return float("-inf")

    score = len(real) * 20
    score += sum(zipf_frequency(w, "en") for w in real)
    score -= (len(tokens) - len(real)) * 10
    if len(real) / len(tokens) < 0.5:
        score -= 50
    return score

def validate(encoded_messages):
    best_sentence, best_score = None, float("-inf")
    for msg in encoded_messages:
        for cand in generate_versions(msg):
            s = score_sentence(cand)
            if s > best_score:
                best_score, best_sentence = s, cand
    return best_sentence