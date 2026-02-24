import type { Condition, Finish, ParsedLine } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITIONS: Condition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']
// NM/M is an alias for NM used in some communities
const CONDITION_ALIASES: Record<string, Condition> = { 'NM/M': 'NM', 'PLD': 'LP' }

const SET_NORMALIZE: Record<string, string> = {
  'arthurian':         'Arthurian Legends',
  'arthurian legends': 'Arthurian Legends',
  'promo':             'Promotional',
  'promotional':       'Promotional',
  'alpha':             'Alpha',
  'beta':              'Beta',
  'gothic':            'Gothic',
  'dragonlord':        'Dragonlord',
}

// All known set display names (for plain-text matching)
const SET_TOKENS = Object.keys(SET_NORMALIZE)
  .concat(Object.values(SET_NORMALIZE))
  .map(s => s.toLowerCase())
  // Deduplicate
  .filter((v, i, a) => a.indexOf(v) === i)
  // Longest first so "arthurian legends" matches before "arthurian"
  .sort((a, b) => b.length - a.length)

const RARITY_TOKENS = ['ordinary', 'exceptional', 'elite', 'unique']

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseLine(line: string): ParsedLine | null {
  line = line.trim()
  if (!line) return null

  let qty = 1
  let condition: Condition = 'NM'
  let finish: Finish = 'Standard'
  let setName = ''

  // ── Quantity ──────────────────────────────────────────────────────────────
  // Matches: 4x  4X  4 x  x4  X4  4  (at start of string)
  const qtyMatch = line.match(/^(\d+)\s*[xX]?\s+|^[xX](\d+)\s+/)
  if (qtyMatch) {
    qty = parseInt(qtyMatch[1] ?? qtyMatch[2], 10)
    line = line.slice(qtyMatch[0].length)
  }

  // ── Condition ─────────────────────────────────────────────────────────────
  // Check aliases first (NM/M before NM to avoid partial match)
  for (const [alias, mapped] of Object.entries(CONDITION_ALIASES)) {
    const re = new RegExp(`\\b${alias.replace('/', '\\/')}\\b`, 'i')
    if (re.test(line)) {
      condition = mapped
      line = line.replace(re, '').trim()
      break
    }
  }
  if (condition === 'NM') {
    // Only run standard conditions if alias didn't match
    for (const cond of CONDITIONS) {
      const re = new RegExp(`\\b${cond}\\b`, 'i')
      if (re.test(line)) {
        condition = cond
        line = line.replace(re, '').trim()
        break
      }
    }
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  if (/\brainbow\s+foil\b/i.test(line)) {
    finish = 'Rainbow'
    line = line.replace(/\brainbow\s+foil\b/i, '').trim()
  } else if (/\brainbow\b/i.test(line)) {
    finish = 'Rainbow'
    line = line.replace(/\brainbow\b/i, '').trim()
  } else if (/\bfoil\b/i.test(line)) {
    finish = 'Foil'
    line = line.replace(/\bfoil\b/i, '').trim()
  }

  // ── Set name (parenthetical first, then plain) ────────────────────────────
  const parenMatch = line.match(/\(([^)]+)\)/)
  if (parenMatch) {
    const candidate = parenMatch[1].trim().toLowerCase()
    const normalized = SET_NORMALIZE[candidate]
    if (normalized) {
      setName = normalized
      line = line.replace(parenMatch[0], '').trim()
    }
  } else {
    for (const token of SET_TOKENS) {
      const re = new RegExp(`\\b${token.replace(/\s+/g, '\\s+')}\\b`, 'i')
      if (re.test(line)) {
        setName = SET_NORMALIZE[token] ?? token
        line = line.replace(re, '').trim()
        break
      }
    }
  }

  // ── Strip rarity tokens (we get rarity from DB, not paste) ───────────────
  for (const r of RARITY_TOKENS) {
    const re = new RegExp(`\\b${r}\\b`, 'i')
    if (re.test(line)) {
      line = line.replace(re, '').trim()
      break
    }
  }

  // ── Clean remaining name ──────────────────────────────────────────────────
  const rawName = line
    .replace(/\s+/g, ' ')
    .replace(/^[-,·\s]+|[-,·\s]+$/g, '')
    .trim()

  if (!rawName) return null

  return { rawName, qty, condition, finish, setName }
}

/** Parse a multi-line paste, returning one ParsedLine per valid line */
export function parseCardList(text: string): ParsedLine[] {
  return text
    .split('\n')
    .map(parseLine)
    .filter((l): l is ParsedLine => l !== null)
}
