import type { PriceData, CardPrice } from '@/types'

let priceData: PriceData | null = null

/**
 * Fetch and cache prices.json once per session.
 * Resolves to null gracefully if the file is missing or malformed —
 * the app works fine without prices, they're purely additive.
 */
export async function loadPrices(): Promise<PriceData | null> {
  if (priceData) return priceData
  try {
    const res = await fetch('/prices.json')
    if (!res.ok) return null
    const data = await res.json() as PriceData
    // Basic sanity check
    if (!data.prices || typeof data.prices !== 'object') return null
    priceData = data
    return priceData
  } catch {
    return null
  }
}

/**
 * Look up the market price for a given variant slug.
 * Returns null if no price data is loaded or the slug isn't in the dataset.
 */
export function getPrice(slug: string | null): CardPrice | null {
  if (!slug || !priceData) return null
  return priceData.prices[slug] ?? null
}

/**
 * Resolve the best slug for a card row based on its matched card,
 * selected set, and finish. Returns null if the card isn't matched.
 */
export function resolveSlug(
  sets: { n: string; v: { slug: string; finish: string }[] }[],
  setName: string,
  finish: string,
): string | null {
  const setData = sets.find(s => s.n === setName) ?? sets[sets.length - 1]
  if (!setData) return null
  // Prefer exact finish match, fall back to Standard
  const exact = setData.v.find(v => v.finish === finish)
  if (exact) return exact.slug
  const standard = setData.v.find(v => v.finish === 'Standard')
  return standard?.slug ?? setData.v[0]?.slug ?? null
}

export function getPriceData(): PriceData | null {
  return priceData
}
