import type { CardRow, ListingType, SellerInfo } from '@/types'

function formatPrice(price: string, currency: string): string {
  const n = parseFloat(price)
  if (isNaN(n) || n === 0) return ''
  return ` — ${currency} $${n.toFixed(2)} each`
}

function groupBySet(cards: CardRow[]): Map<string, CardRow[]> {
  const map = new Map<string, CardRow[]>()
  for (const card of cards) {
    const key = card.setName || 'Unknown Set'
    const existing = map.get(key) ?? []
    existing.push(card)
    map.set(key, existing)
  }
  return map
}

export function generateAd(
  cards: CardRow[],
  listingType: ListingType,
  seller: SellerInfo,
): string {
  const lines: string[] = []
  const currency = seller.currency || 'USD'

  // ── Header ────────────────────────────────────────────────────────────────
  const setList = [...new Set(cards.map(c => c.setName || 'Unknown'))].join(' & ')
  const typeLabel =
    listingType === 'selling' ? 'Selling' :
    listingType === 'buying'  ? 'Buying'  : 'Trading'

  lines.push(`**📜 Sorcery: CR — ${typeLabel} [${setList}]**`)
  lines.push('')

  // ── Card list grouped by set ───────────────────────────────────────────────
  const grouped = groupBySet(cards)
  for (const [setName, setCards] of grouped) {
    lines.push(`**${setName}**`)
    for (const card of setCards) {
      const name = card.matchedCard?.name ?? card.rawName
      const rarity = card.matchedCard?.rarity
      const rarityStr = rarity ? ` (${rarity})` : ''
      const foilStr = card.finish !== 'Standard' ? ` ${card.finish}` : ''
      const priceStr = card.price ? formatPrice(card.price, currency) : ''
      lines.push(`${card.qty}× ${name}${rarityStr}${foilStr} — ${card.condition}${priceStr}`)
    }
    lines.push('')
  }

  // ── Total / offers ────────────────────────────────────────────────────────
  if (listingType !== 'trading') {
    const total = cards.reduce(
      (sum, c) => sum + (parseFloat(c.price) || 0) * (c.qty || 1),
      0,
    )
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
  if (seller.shipsTo.trim()) shippingParts.push(`→ ${seller.shipsTo.trim()}`)
  if (shippingParts.length > 0) {
    lines.push(`Shipping: ${shippingParts.join(' ')}`)
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  if (seller.comments.trim()) {
    lines.push(`Notes: ${seller.comments.trim()}`)
  }

  // ── Sign-off ──────────────────────────────────────────────────────────────
  lines.push('')
  lines.push(seller.discord.trim() ? `DM ${seller.discord.trim()} ✉` : 'DM me! ✉')

  return lines.join('\n')
}

/** Returns total value of all priced cards */
export function calcTotal(cards: CardRow[]): number {
  return cards.reduce(
    (sum, c) => sum + (parseFloat(c.price) || 0) * (c.qty || 1),
    0,
  )
}
