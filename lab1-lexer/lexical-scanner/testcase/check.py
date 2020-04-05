import os
import re

files = os.listdir('.')
codes = filter(lambda x: x.endswith('.txt'), files)

for code in codes:
    print(code)
    out = open(code + '.out', 'r').read()
    code = open(code, 'r').read()

    code = ''.join(re.sub('[ \t\n]', '', code))
    out = [x.split(', ')[1] for x in out.split('\n')]
    out = ''.join(out)

    print(code == out)
    if code != out:
        print(code)
        print(out)
    print()
