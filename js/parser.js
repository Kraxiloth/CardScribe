// parser.js — freehand card list parser + fuzzy matcher
// Requires: cards.js (CARD_DB), Fuse.js from CDN

let _fuse = null;

function getFuse() {
  if (_fuse) return _fuse;
  if (typeof Fuse === 'undefined') return null;
  _fuse = new Fuse(CARD_DB, {
    keys: ['name'],
    threshold: 0.35,
    includeScore: true,
  });
  return _fuse;
}

const FINISHES    = ['rainbow', 'foil', 'standard'];
const CONDITIONS  = ['nm', 'lp', 'mp', 'hp', 'dmg'];
const RARITIES    = ['unique', 'elite', 'exceptional', 'ordinary'];
const SET_NAMES   = [
  'alpha', 'beta', 'arthurian legends', 'arthurian', 'gothic', 'promotional', 'promo',
];

function parseLine(line) {
  line = line.trim();
  if (!line) return null;

  let qty = 1;
  // Match leading quantity: "2x", "2 x", "x2", "2"
  const qtyMatch = line.match(/^(\d+)\s*x?\s+/i) || line.match(/^x(\d+)\s+/i);
  if (qtyMatch) {
    qty  = parseInt(qtyMatch[1]);
    line = line.slice(qtyMatch[0].length).trim();
  }

  // Strip parentheses e.g. "(Alpha)" → "Alpha"
  line = line.replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').trim();

  const tokens = line.split(/\s+/);

  // Extract known tokens from the end
  let finish    = 'Standard';
  let condition = 'NM';
  let setName   = '';
  let rarity    = '';

  // Walk tokens right to left extracting known values
  const remaining = [...tokens];

  for (let i = remaining.length - 1; i >= 0; i--) {
    const t = remaining[i].toLowerCase();
    if (CONDITIONS.includes(t)) {
      condition = remaining[i].toUpperCase();
      remaining.splice(i, 1);
    } else if (t === 'foil') {
      finish = 'Foil';
      remaining.splice(i, 1);
    } else if (t === 'rainbow') {
      finish = 'Rainbow';
      remaining.splice(i, 1);
    } else if (t === 'standard') {
      finish = 'Standard';
      remaining.splice(i, 1);
    } else if (RARITIES.includes(t)) {
      rarity = remaining[i];
      remaining.splice(i, 1);
    }
  }

  // Check for set names (multi-word first)
  const remainingStr = remaining.join(' ');
  for (const set of SET_NAMES.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${set}\\b`, 'i');
    if (re.test(remainingStr)) {
      // Capitalise properly
      setName = set.replace(/\b\w/g, c => c.toUpperCase());
      // Map shorthand
      if (setName.toLowerCase() === 'arthurian') setName = 'Arthurian Legends';
      if (setName.toLowerCase() === 'promo')     setName = 'Promotional';
      const cleaned = remainingStr.replace(re, '').replace(/\s+/g, ' ').trim();
      const rawName = cleaned;
      return { qty, rawName, finish, condition, setName, rarity };
    }
  }

  return { qty, rawName: remainingStr.trim(), finish, condition, setName, rarity };
}

function parseCardList(text) {
  return text.split('\n')
    .map(parseLine)
    .filter(Boolean);
}

function findCard(name, setName) {
  if (!name) return null;
  // Exact match first
  const exact = CARD_DB.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  // Fuzzy
  const fuse = getFuse();
  if (!fuse) return null;
  const results = fuse.search(name);
  return results.length > 0 ? results[0].item : null;
}

function getSuggestions(name, limit = 3) {
  const fuse = getFuse();
  if (!fuse || !name) return [];
  return fuse.search(name).slice(0, limit).map(r => r.item.name);
}
