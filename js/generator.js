// generator.js — Discord ad formatter

const RARITY_ORDER = { Unique: 0, Elite: 1, Exceptional: 2, Ordinary: 3 };

function sortByRarity(cards) {
  return [...cards].sort((a, b) => {
    const ra = RARITY_ORDER[a.matchedCard?.rarity] ?? 4;
    const rb = RARITY_ORDER[b.matchedCard?.rarity] ?? 4;
    if (ra !== rb) return ra - rb;
    return (a.matchedCard?.name ?? a.rawName).localeCompare(b.matchedCard?.name ?? b.rawName);
  });
}

function groupBySet(cards) {
  const map = new Map();
  cards.forEach(card => {
    const key = card.setName || 'Unknown Set';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  });
  return map;
}

function resolveEffectivePrice(card) {
  if (card.price !== '') return parseFloat(card.price) || null;
  return getAdjustedPrice(card.slug, card.condition);
}

function generateAd(cards, listingType, seller) {
  const lines    = [];
  const currency = seller.currency || 'USD';
  const sets     = [...new Set(cards.map(c => c.setName || 'Unknown'))].join(' & ');
  const typeLabel = listingType === 'selling' ? 'Selling'
                  : listingType === 'buying'  ? 'Buying' : 'Trading';

  // Header
  lines.push(`**📜 Sorcery: CR — ${typeLabel} [${sets}]**`);
  lines.push('');

  // Cards grouped by set, sorted by rarity
  const grouped = groupBySet(cards);
  for (const [setName, setCards] of grouped) {
    lines.push(`**${setName}**`);
    for (const card of sortByRarity(setCards)) {
      const name     = card.matchedCard?.name ?? card.rawName;
      const rarity   = card.matchedCard?.rarity;
      const rarStr   = rarity ? ` (${rarity})` : '';
      const foilStr  = card.finish !== 'Standard' ? ` ${card.finish}` : '';
      const price    = resolveEffectivePrice(card);
      const priceStr = price !== null ? ` — ${currency} $${price.toFixed(2)} each` : '';
      lines.push(`${card.qty}× ${name}${rarStr}${foilStr} — ${card.condition}${priceStr}`);
    }
    lines.push('');
  }

  // Total
  if (listingType !== 'trading') {
    const total = cards.reduce((sum, c) => {
      const p = resolveEffectivePrice(c);
      return sum + (p ?? 0) * (c.qty || 1);
    }, 0);
    if (total > 0) {
      const offersStr = seller.openToOffers ? ' *(open to offers)*' : '';
      lines.push(`**Total asking: ${currency} $${total.toFixed(2)}**${offersStr}`);
      lines.push('');
    }
  }

  // Payment
  if (seller.paymentMethods) lines.push(`Payment: ${seller.paymentMethods}`);

  // Trade offer
  if (listingType === 'trading' && seller.tradeOffer?.trim()) {
    lines.push(`Offering: ${seller.tradeOffer.trim()}`);
  }

  // Shipping
  const shipParts = [];
  if (seller.shipsFrom?.trim()) shipParts.push(seller.shipsFrom.trim());
  if (seller.shipsTo?.trim())   shipParts.push(`→ ${seller.shipsTo.trim()}`);
  if (shipParts.length) lines.push(`Shipping: ${shipParts.join(' ')}`);

  // Comments
  if (seller.comments?.trim()) lines.push(`Notes: ${seller.comments.trim()}`);

  // Sign-off
  lines.push('');
  lines.push(seller.discord?.trim() ? `DM ${seller.discord.trim()} ✉` : 'DM me! ✉');

  // Attribution
  if (PRICES.loaded) {
    lines.push('');
    lines.push(`*Prices courtesy of ${PRICES.data.source} · ${PRICES.data.sourceUrl}*`);
  }

  return lines.join('\n');
}
