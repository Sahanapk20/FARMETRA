import re

with open('src/locales/translations.ts.old', 'r', encoding='utf-8') as f:
    content = f.read()

keys = ['batchId', 'verified', 'organicWheat', 'goldenValleyFarm', 'harvested', 'processing', 'inTransit', 'scanToVerify', 'blockchainVerified', 'supplyChainCoverage']

for key in keys:
    pattern = rf"{key}:\s*['\"]([^'\"]+)['\"]"
    matches = re.findall(pattern, content)
    print(f"{key} matches: {len(matches)}")
