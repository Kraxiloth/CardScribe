"""
generate_cards_json.py — converts cards.js to cards.json for use by scrape_prices.py
Run once locally or as part of the GitHub Action.
"""
import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CARDS_JS   = os.path.join(os.path.dirname(SCRIPT_DIR), 'js', 'cards.js')
CARDS_JSON = os.path.join(SCRIPT_DIR, 'cards.json')

with open(CARDS_JS, 'r', encoding='utf-8') as f:
    js = f.read()

# Extract the array content between CARD_DB = [ and ];
match = re.search(r'const CARD_DB = \[(.*)\];', js, re.DOTALL)
if not match:
    raise ValueError('Could not find CARD_DB in cards.js')

# Convert JS object notation to valid JSON
content = match.group(1).strip().rstrip(',')

# Fix JS object keys to quoted JSON keys
content = re.sub(r"(\{|,)\s*(\w+)\s*:", lambda m: m.group(1) + '"' + m.group(2) + '":', content)

# Fix single-quoted strings to double-quoted
content = re.sub(r"'([^']*)'", lambda m: '"' + m.group(1).replace('"', '\\"') + '"', content)

# Wrap in array
json_str = '[' + content + ']'

try:
    cards = json.loads(json_str)
    with open(CARDS_JSON, 'w', encoding='utf-8') as f:
        json.dump(cards, f)
    print(f'Generated cards.json with {len(cards)} cards')
except json.JSONDecodeError as e:
    print(f'JSON parse error: {e}')
    # Show context around error
    pos = e.pos
    print(f'Context: ...{json_str[max(0,pos-50):pos+50]}...')
    raise
