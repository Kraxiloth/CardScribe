import Fuse from 'fuse.js'
import type { RawCardRecord, CardRecord } from '@/types'
import rawData from './cards.json'

// Normalise minified keys → full CardRecord shape
export const CARDS: CardRecord[] = (rawData as RawCardRecord[]).map(c => ({
  name: c.n,
  rarity: c.r,
  type: c.t,
  sets: c.s,
}))

// Fuse index — built once at module load time
export const cardFuse = new Fuse(CARDS, {
  keys: ['name'],
  threshold: 0.35,
  includeScore: true,
  minMatchCharLength: 2,
})

/** Return the best matching CardRecord, or null if no confident match */
export function findCard(query: string, preferredSet?: string): CardRecord | null {
  const results = cardFuse.search(query)
  if (!results.length) return null

  // If a set is specified, prefer a result that actually has that set
  if (preferredSet) {
    const withSet = results.find(r =>
      r.item.sets.some(s => s.n.toLowerCase() === preferredSet.toLowerCase())
    )
    if (withSet && (withSet.score ?? 1) < 0.4) return withSet.item
  }

  return (results[0].score ?? 1) < 0.4 ? results[0].item : null
}

/** Return up to N alternative name suggestions for an unmatched query */
export function getSuggestions(query: string, count = 2): string[] {
  return cardFuse
    .search(query)
    .slice(0, count + 1)
    .filter(r => (r.score ?? 1) < 0.6)
    .map(r => r.item.name)
    .slice(0, count)
}
