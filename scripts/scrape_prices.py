"""
scrape_prices.py — Fetches TCGPlayer price data for Sorcery: Contested Realm
via the TCGPlayer search API and outputs public/prices.json.

Usage:
  python scrape_prices.py

Requirements:
  pip install requests fuzzywuzzy python-Levenshtein
"""

import json
import os
import re
import sys
import time
import requests
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(SCRIPT_DIR)
CARDS_JSON  = os.path.join(SCRIPT_DIR, 'cards.json')
OUTPUT_PATH = os.path.join(REPO_ROOT, 'public', 'prices.json')

API_URL   = 'https://mp-search-api.tcgplayer.com/v1/search/request'
PAGE_SIZE = 50

HEADERS = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

# ---------------------------------------------------------------------------
def load_cards():
    with open(CARDS_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_slug_index(cards):
    index = {}
    for card in cards:
        name_key = card['name'].lower().strip()
        for s in card.get('sets', []):
            set_name = s['n']
            for v in s.get('v', []):
                key = (name_key, set_name.lower(), v['finish'].lower())
                index[key] = v['slug']
    return index

def build_name_list(cards):
    return list(set(c['name'] for c in cards))

def fuzzy_match(name, name_list, threshold=85):
    from fuzzywuzzy import process
    result = process.extractOne(name, name_list)
    if result and result[1] >= threshold:
        return result[0], result[1]
    return None, 0

# ---------------------------------------------------------------------------
def fetch_all_products():
    all_results = []

    print('Fetching page 1...')
    body = {
        'algorithm': 'sales_synonym_v2',
        'from':      0,
        'size':      PAGE_SIZE,
        'filters': {
            'term': {
                'productLineName': ['Sorcery Contested Realm']
            }
        },
        'listingSearch': {
            'filters': {
                'range': {
                    'quantity': {'gte': 1}
                }
            }
        },
        'context': {
            'shippingCountry': 'US'
        }
    }

    resp = requests.post(API_URL, headers=HEADERS, json=body, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    total       = data['results']['totalResults']
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    print(f'Total products: {total} across {total_pages} pages')

    all_results.extend(data['results']['results'])

    for page in range(1, total_pages):
        print(f'Fetching page {page + 1} / {total_pages}...')
        body['from'] = page * PAGE_SIZE
        resp = requests.post(API_URL, headers=HEADERS, json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        all_results.extend(data['results']['results'])
        time.sleep(0.5)

    print(f'Fetched {len(all_results)} total products')
    return all_results

# ---------------------------------------------------------------------------
def detect_finish(product_name):
    name_lower = product_name.lower()
    if 'rainbow foil' in name_lower:
        return 'Rainbow'
    if 'foil' in name_lower:
        return 'Foil'
    return 'Standard'

def clean_name(product_name):
    name = product_name
    name = re.sub(r'\s*\([^)]*\)', '', name).strip()
    name = re.sub(r'\s*(rainbow foil|foil)\s*$', '', name, flags=re.IGNORECASE).strip()
    return name

# ---------------------------------------------------------------------------
def main():
    sys.stdout.reconfigure(encoding='utf-8')

    print('Loading card database...')
    cards      = load_cards()
    slug_index = build_slug_index(cards)
    name_list  = build_name_list(cards)
    print(f'Loaded {len(cards)} cards, {len(slug_index)} slug variants')

    try:
        products = fetch_all_products()
    except Exception as e:
        print(f'ERROR fetching from API: {e}')
        sys.exit(1)

    prices  = {}
    flagged = []
    exact   = 0
    fuzzy_c = 0
    skipped = 0

    for product in products:
        raw_name = product.get('productName', '')
        set_name = product.get('setName', '')
        market   = product.get('marketPrice')
        lowest   = product.get('lowestPrice')

        if not raw_name or market is None:
            continue

        finish     = detect_finish(raw_name)
        clean      = clean_name(raw_name)
        name_lower = clean.lower().strip()
        set_lower  = set_name.lower().strip()

        slug = slug_index.get((name_lower, set_lower, finish.lower()))

        if slug:
            exact += 1
        else:
            matched_name, score = fuzzy_match(clean, name_list)
            if matched_name:
                slug = slug_index.get((matched_name.lower(), set_lower, finish.lower()))
                if slug:
                    fuzzy_c += 1
                    flagged.append({
                        'tcg_name': raw_name,
                        'matched':  matched_name,
                        'score':    score,
                        'set':      set_name,
                        'finish':   finish,
                        'slug':     slug,
                    })
                else:
                    skipped += 1
                    continue
            else:
                skipped += 1
                continue

        prices[slug] = {
            'market': market,
            'low':    lowest,
        }

    print(f'Results: {exact} exact, {fuzzy_c} fuzzy, {skipped} skipped')

    output = {
        'updated':   datetime.now(timezone.utc).isoformat(),
        'source':    'TCGPlayer',
        'sourceUrl': 'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides',
        'prices':    prices,
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print(f'Wrote {len(prices)} price entries to {OUTPUT_PATH}')

    if flagged:
        print(f'{len(flagged)} cards fuzzy matched - saved to price_review.json')
        review_path = os.path.join(SCRIPT_DIR, 'price_review.json')
        with open(review_path, 'w', encoding='utf-8') as f:
            json.dump(flagged, f, indent=2)

if __name__ == '__main__':
    main()
