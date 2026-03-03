"""
scrape_prices.py — Scrapes TCGPlayer price guides for Sorcery: Contested Realm
and outputs public/prices.json in the format CardScribe expects.

Usage:
  Test mode (from saved HTML file):
    python scrape_prices.py --test path/to/saved_page.html --set alpha

  Live mode (hits TCGPlayer):
    python scrape_prices.py --live

Requirements:
  pip install playwright fuzzywuzzy python-Levenshtein
  python -m playwright install chromium
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

# ── Card database ──────────────────────────────────────────────────────────────
# Load card slugs from cards.json (generated from the same source as cards.js)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(SCRIPT_DIR)
CARDS_JSON  = os.path.join(SCRIPT_DIR, 'cards.json')
OUTPUT_PATH = os.path.join(REPO_ROOT, 'public', 'prices.json')

SETS = {
    'alpha':             'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides/alpha',
    'beta':              'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides/beta',
    'arthurian-legends': 'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides/arthurian-legends',
    'gothic':            'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides/gothic',
    'dragonlord':        'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides/dragonlord',
}

SET_NAME_MAP = {
    'alpha':             'Alpha',
    'beta':              'Beta',
    'arthurian-legends': 'Arthurian Legends',
    'gothic':            'Gothic',
    'dragonlord':        'Dragonlord',
}

# ── Load card database ─────────────────────────────────────────────────────────
def load_cards():
    with open(CARDS_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_slug_index(cards):
    """Build a lookup: (normalized_name, set_name, finish) -> slug"""
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
    """Flat list of card names for fuzzy matching"""
    return list(set(c['name'] for c in cards))

# ── Fuzzy matching ─────────────────────────────────────────────────────────────
def fuzzy_match(name, name_list, threshold=85):
    from fuzzywuzzy import process
    result = process.extractOne(name, name_list)
    if result and result[1] >= threshold:
        return result[0], result[1]
    return None, 0

# ── Parse price table from HTML ────────────────────────────────────────────────
def parse_price_table(html, set_key):
    """
    Extract rows from TCGPlayer price guide table.
    Returns list of dicts: {name, finish, market, low}
    """
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    rows = []

    # TCGPlayer price guide table has class 'price-guide__table' or similar
    # Find all table rows
    table = soup.find('table')
    if not table:
        # Try finding rows directly
        print(f'  WARNING: No table found for {set_key}')
        return rows

    headers = []
    header_row = table.find('thead')
    if header_row:
        headers = [th.get_text(strip=True).lower() for th in header_row.find_all('th')]
    print(f'  Headers: {headers}')

    tbody = table.find('tbody')
    if not tbody:
        print(f'  WARNING: No tbody found for {set_key}')
        return rows

    for tr in tbody.find_all('tr'):
        cells = [td.get_text(strip=True) for td in tr.find_all('td')]
        if not cells:
            continue

        try:
            # Typical TCGPlayer columns: Name, Rarity, Low, Mid, Market, Direct Low
            # Map by header position if available
            if headers and len(cells) >= len(headers):
                row_dict = dict(zip(headers, cells))
            else:
                row_dict = {str(i): v for i, v in enumerate(cells)}

            name   = row_dict.get('product name', row_dict.get('name', cells[0] if cells else ''))
            rarity = row_dict.get('rarity', '')

            # Detect foil — TCGPlayer usually has separate rows or a "Foil" suffix
            finish = 'Foil' if 'foil' in name.lower() else 'Standard'
            name   = re.sub(r'\s*\[foil\]', '', name, flags=re.IGNORECASE).strip()
            name   = re.sub(r'\s*foil\s*$', '', name, flags=re.IGNORECASE).strip()

            # Price columns
            market_str = row_dict.get('market price', row_dict.get('market', ''))
            low_str    = row_dict.get('low', row_dict.get('low price', ''))

            market = parse_price(market_str)
            low    = parse_price(low_str)

            if name and market is not None:
                rows.append({
                    'name':   name,
                    'finish': finish,
                    'market': market,
                    'low':    low,
                })
        except Exception as e:
            print(f'  Row parse error: {e} — {cells}')
            continue

    print(f'  Parsed {len(rows)} rows from {set_key}')
    return rows

def parse_price(s):
    if not s:
        return None
    s = re.sub(r'[^\d.]', '', s)
    try:
        return float(s)
    except ValueError:
        return None

# ── Fetch page with Playwright ─────────────────────────────────────────────────
def fetch_page(url):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,  # Run with visible browser window
            args=['--start-maximized']
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
            locale='en-US',
            timezone_id='America/New_York',
        )
        page = context.new_page()
        print(f'  Fetching {url}...')
        page.goto(url, wait_until='networkidle', timeout=60000)
        try:
            page.wait_for_selector('table', timeout=30000)
        except Exception:
            print('  WARNING: Table did not appear within timeout')
        html = page.content()
        browser.close()
        return html

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--test',  help='Path to saved HTML file for test mode')
    parser.add_argument('--set',   help='Set key for test mode (e.g. alpha)')
    parser.add_argument('--all-test', nargs='+', metavar='SET=FILE',
                        help='Test multiple sets at once: --all-test alpha=file1.html beta=file2.html')
    parser.add_argument('--live',  action='store_true', help='Scrape live TCGPlayer pages')
    args = parser.parse_args()

    if not args.test and not args.live and not args.all_test:
        print('Usage: python scrape_prices.py --test file.html --set alpha')
        print('       python scrape_prices.py --all-test alpha=alpha.html beta=beta.html gothic=gothic.html')
        print('       python scrape_prices.py --live')
        sys.exit(1)

    # Load card database
    print('Loading card database...')
    cards      = load_cards()
    slug_index = build_slug_index(cards)
    name_list  = build_name_list(cards)
    print(f'Loaded {len(cards)} cards, {len(slug_index)} slug variants')

    prices     = {}
    flagged    = []

    if args.all_test:
        # Multi-set test mode
        for pair in args.all_test:
            if '=' not in pair:
                print(f'  ERROR: expected SET=FILE format, got: {pair}')
                continue
            set_key, filepath = pair.split('=', 1)
            set_key = set_key.strip()
            filepath = filepath.strip()
            print(f'\nTest mode: parsing {filepath} as set "{set_key}"')
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    html = f.read()
                rows = parse_price_table(html, set_key)
                process_rows(rows, set_key, slug_index, name_list, prices, flagged)
            except FileNotFoundError:
                print(f'  ERROR: File not found: {filepath}')

    elif args.test:
        # Single set test mode
        set_key = args.set or 'alpha'
        print(f'\nTest mode: parsing {args.test} as set "{set_key}"')
        with open(args.test, 'r', encoding='utf-8') as f:
            html = f.read()
        rows = parse_price_table(html, set_key)
        process_rows(rows, set_key, slug_index, name_list, prices, flagged)

    elif args.live:
        # Live mode — scrape all sets
        for set_key, url in SETS.items():
            print(f'\nScraping {set_key}...')
            try:
                html = fetch_page(url)
                rows = parse_price_table(html, set_key)
                process_rows(rows, set_key, slug_index, name_list, prices, flagged)
                time.sleep(2)  # Be polite — 2 second delay between requests
            except Exception as e:
                print(f'  ERROR scraping {set_key}: {e}')

    # Write output
    output = {
        'updated':   datetime.now(timezone.utc).isoformat(),
        'source':    'TCGPlayer',
        'sourceUrl': 'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides',
        'prices':    prices,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    print(f'\n✓ Wrote {len(prices)} price entries to {OUTPUT_PATH}')

    if flagged:
        print(f'\n⚠ {len(flagged)} cards flagged for review (fuzzy matched):')
        for item in flagged:
            print(f'  TCGPlayer: "{item["tcg_name"]}" → Matched: "{item["matched"]}" (score {item["score"]}) — {item["slug"]}')

        # Write flagged to a review file
        review_path = os.path.join(SCRIPT_DIR, 'price_review.json')
        with open(review_path, 'w', encoding='utf-8') as f:
            json.dump(flagged, f, indent=2)
        print(f'  Saved to {review_path}')

def process_rows(rows, set_key, slug_index, name_list, prices, flagged):
    set_name = SET_NAME_MAP.get(set_key, set_key.title())
    exact    = 0
    fuzzy    = 0
    skipped  = 0

    for row in rows:
        name        = row['name']
        finish      = row['finish']
        name_lower  = name.lower().strip()
        set_lower   = set_name.lower()
        finish_lower = finish.lower()

        # Try exact match first
        slug = slug_index.get((name_lower, set_lower, finish_lower))

        if slug:
            exact += 1
        else:
            # Try fuzzy match
            matched_name, score = fuzzy_match(name, name_list)
            if matched_name:
                slug = slug_index.get((matched_name.lower(), set_lower, finish_lower))
                if slug:
                    fuzzy += 1
                    flagged.append({
                        'tcg_name': name,
                        'matched':  matched_name,
                        'score':    score,
                        'set':      set_name,
                        'finish':   finish,
                        'slug':     slug,
                    })
                else:
                    skipped += 1
                    print(f'  SKIP (no slug after fuzzy): "{name}" → "{matched_name}" in {set_name} {finish}')
            else:
                skipped += 1
                print(f'  SKIP (no match): "{name}" in {set_name} {finish}')
                continue

        prices[slug] = {
            'market': row['market'],
            'low':    row['low'],
        }

    print(f'  {exact} exact, {fuzzy} fuzzy, {skipped} skipped')

if __name__ == '__main__':
    main()
