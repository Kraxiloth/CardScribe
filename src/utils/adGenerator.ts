import type { CardRow, ListingType, SellerInfo } from '@/types'
import { getPrice, getPriceData } from '@/data/prices'

// Condition multipliers for auto-price adjustment
const CONDITION_MULTIPLIER: Record<string, number> = {
  NM: 1.0, LP: 0.85, MP: 0.70, HP: 0.50, DMG: 0.30,
}

/** Returns the effective price for a card — manual override or auto market price */
function resolvePrice(card: CardRow): number | null {
  if (card.price !== '') {
    const n = parseFloat(card.price)
    return isNaN(n) ? null : n
  }
  const lookup = getPrice(card.slug)
  if (!lookup) return null
  const mult = CONDITION_MULTIPLIER[card.condition] ?? 1.0
  return parseFloat((lookup.market * mult).toFixed(2))
}

function groupBySet(cards: CardRow[]): Map<string, CardRow[]> {
  const map = new Map<string, CardRow[]>()
  for (const card of cards) {
    const key = card.setName || 'Unknown Set'
    map.set(key, [...(map.get(key) ?? []), card])
  }
  return map
}

// Sort order: Unique → Elite → Exceptional → Ordinary
const RARITY_ORDER: Record<string, number> = {
  Unique: 0, Elite: 1, Exceptional: 2, Ordinary: 3,
}

function sortByRarity(cards: CardRow[]): CardRow[] {
  return [...cards].sort((a, b) => {
    const ra = RARITY_ORDER[a.matchedCard?.rarity ?? ''] ?? 4
    const rb = RARITY_ORDER[b.matchedCard?.rarity ?? ''] ?? 4
    if (ra !== rb) return ra - rb
    return (a.matchedCard?.name ?? a.rawName).localeCompare(b.matchedCard?.name ?? b.rawName)
  })
}

export function generateAd(
  cards: CardRow[],
  listingType: ListingType,
  seller: SellerInfo,
): string {
  const lines: string[] = []
  const currency  = seller.currency || 'USD'
  const priceData = getPriceData()

  // ── Header ────────────────────────────────────────────────────────────────
  const setList   = [...new Set(cards.map(c => c.setName || 'Unknown'))].join(' & ')
  const typeLabel = listingType === 'selling' ? 'Selling'
                  : listingType === 'buying'  ? 'Buying' : 'Trading'

  lines.push(`**📜 Sorcery: CR — ${typeLabel} [${setList}]**`)
  lines.push('')

  // ── Card list ─────────────────────────────────────────────────────────────
  const grouped = groupBySet(cards)
  for (const [setName, setCards] of grouped) {
    lines.push(`**${setName}**`)
    for (const card of sortByRarity(setCards)) {
      const name      = card.matchedCard?.name ?? card.rawName
      const rarity    = card.matchedCard?.rarity
      const rarityStr = rarity ? ` (${rarity})` : ''
      const foilStr   = card.finish !== 'Standard' ? ` ${card.finish}` : ''
      const price     = resolvePrice(card)
      const priceStr  = price !== null ? ` — ${currency} $${price.toFixed(2)} each` : ''
      lines.push(`${card.qty}× ${name}${rarityStr}${foilStr} — ${card.condition}${priceStr}`)
    }
    lines.push('')
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  if (listingType !== 'trading') {
    const total = cards.reduce((sum, c) => {
      const p = resolvePrice(c)
      return sum + (p ?? 0) * (c.qty || 1)
    }, 0)
    if (total > 0) {
      const offersStr = seller.openToOffers ? ' *(open to offers)*' : ''
      lines.push(`**Total asking: ${currency} $${total.toFixed(2)}**${offersStr}`)
      lines.push('')
    }
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  if (seller.paymentMethods.length > 0) {
    lines.push(`Payment: ${seller.paymentMethods.join(' / ')}`)
  }

  // ── Trade offer ───────────────────────────────────────────────────────────
  if (listingType === 'trading' && seller.tradeOffer.trim()) {
    lines.push(`Offering: ${seller.tradeOffer.trim()}`)
  }

  // ── Shipping ──────────────────────────────────────────────────────────────
  const shippingParts: string[] = []
  if (seller.shipsFrom.trim()) shippingParts.push(seller.shipsFrom.trim())
  if (seller.shipsTo.trim())   shippingParts.push(`→ ${seller.shipsTo.trim()}`)
  if (shippingParts.length > 0) lines.push(`Shipping: ${shippingParts.join(' ')}`)

  // ── Comments ──────────────────────────────────────────────────────────────
  if (seller.comments.trim()) lines.push(`Notes: ${seller.comments.trim()}`)

  // ── Sign-off ──────────────────────────────────────────────────────────────
  lines.push('')
  lines.push(seller.discord.trim() ? `DM ${seller.discord.trim()} ✉` : 'DM me! ✉')

  // ── Price attribution ─────────────────────────────────────────────────────
  if (priceData) {
    lines.push('')
    lines.push(`*Prices courtesy of ${priceData.source} · ${priceData.sourceUrl}*`)
  }

  return lines.join('\n')
}

/** Returns total value using effective prices (auto or manual) */
export function calcTotal(cards: CardRow[]): number {
  return cards.reduce((sum, c) => {
    const p = resolvePrice(c)
    return sum + (p ?? 0) * (c.qty || 1)
  }, 0)
}
