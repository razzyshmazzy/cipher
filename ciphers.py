# Each returns all possible combinations

import string

ref = string.ascii_lowercase

def caesar(s):
    czar = []

    for shift in range(25):
        temp = ""
        for l in s:
            if ref.index(l) + shift >= len(ref):
                l = ref[ref.index(l) - 26 + shift]
            else:
                l = ref[ref.index(l) + shift]
            temp+=l
        czar.append(temp)

    return czar