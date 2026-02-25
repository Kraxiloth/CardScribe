import { useStore } from '../hooks/useStore'
import { findCard, getSuggestions } from '../data'
import { getPrice, resolveSlug } from '../data/prices'
import { showToast } from '../components/Toast'
import type { CardRow, Condition, Finish } from '@/types'
import { CardHover } from '../components/CardHover'  // adjust levels as needed

const CONDITIONS: Condition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']

// Condition multipliers — prices are NM baseline
const CONDITION_MULTIPLIER: Record<Condition, number> = {
  NM: 1.0, LP: 0.85, MP: 0.70, HP: 0.50, DMG: 0.30,
}

function RarityBadge({ rarity }: { rarity: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Ordinary:    { color: '#8a9aaa', borderColor: 'rgba(138,154,170,0.3)', background: 'rgba(138,154,170,0.08)' },
    Exceptional: { color: '#6aaa6a', borderColor: 'rgba(106,170,106,0.3)', background: 'rgba(106,170,106,0.08)' },
    Elite:       { color: '#9a6aee', borderColor: 'rgba(154,106,238,0.3)', background: 'rgba(154,106,238,0.08)' },
    Unique:      { color: '#e8a040', borderColor: 'rgba(232,160,64,0.3)',  background: 'rgba(232,160,64,0.08)'  },
  }
  return <span className="rarity-badge" style={styles[rarity] ?? {}}>{rarity}</span>
}

function blankRow(): CardRow {
  return {
    id: Math.random().toString(36).slice(2),
    rawLine: '', rawName: '', qty: 1,
    condition: 'NM', finish: 'Standard',
    setName: '', matched: false,
    matchedCard: null, suggestions: [],
    price: '', slug: null,
  }
}

/** Returns the effective display price for a card row:
 *  - manual override if set
 *  - market price adjusted for condition if available
 *  - null if neither */
function effectivePrice(card: CardRow): number | null {
  if (card.price !== '') return parseFloat(card.price) || null
  const lookup = getPrice(card.slug)
  if (!lookup) return null
  return parseFloat((lookup.market * CONDITION_MULTIPLIER[card.condition]).toFixed(2))
}

export function StepReview() {
  const cards      = useStore(s => s.cards)
  const priceData  = useStore(s => s.priceData)
  const setCards   = useStore(s => s.setCards)
  const updateCard = useStore(s => s.updateCard)
  const removeCard = useStore(s => s.removeCard)
  const setStep    = useStore(s => s.setStep)

  const hasPrices  = !!priceData
  const unmatched  = cards.filter(c => !c.matched).length
  const matched    = cards.filter(c => c.matched).length

  // Total: use effective price (auto or manual) × qty
  const total = cards.reduce((sum, c) => {
    const p = effectivePrice(c)
    return sum + (p ?? 0) * (c.qty || 1)
  }, 0)

  function addRow() {
    setCards([...cards, blankRow()])
  }

  function fillFromMarket() {
    let filled = 0
    cards.forEach(card => {
      if (card.price !== '') return  // already has a manual price, leave it
      const lookup = getPrice(card.slug)
      if (!lookup) return            // no market data for this card
      const mult  = CONDITION_MULTIPLIER[card.condition] ?? 1.0
      const price = (lookup.market * mult).toFixed(2)
      updateCard(card.id, { price })
      filled++
    })
    if (filled > 0) {
      showToast(`Filled ${filled} card${filled > 1 ? 's' : ''} from market prices`)
    } else {
      showToast('No blank prices to fill — all cards priced or no market data available')
    }
  }

  function handleRematch(card: CardRow) {
    const match = findCard(card.rawName)
    if (match) {
      const setName = card.setName || match.sets[match.sets.length - 1].n
      const slug    = resolveSlug(match.sets, setName, card.finish)
      updateCard(card.id, { matched: true, matchedCard: match, setName, slug, suggestions: [] })
      showToast(`Matched: ${match.name}`)
    } else {
      showToast('Still no match — try correcting the name further')
    }
  }

  function acceptSuggestion(card: CardRow, suggestion: string) {
    const match = findCard(suggestion)
    const setName = match ? match.sets[match.sets.length - 1].n : card.setName
    const slug    = match ? resolveSlug(match.sets, setName, card.finish) : null
    updateCard(card.id, {
      rawName: suggestion, matched: !!match, matchedCard: match,
      suggestions: match ? [] : getSuggestions(suggestion),
      setName, slug,
    })
  }

  function handleSetOrFinishChange(card: CardRow, patch: { setName?: string; finish?: Finish }) {
    const updated = { ...card, ...patch }
    const slug = updated.matchedCard
      ? resolveSlug(updated.matchedCard.sets, updated.setName, updated.finish)
      : null
    updateCard(card.id, { ...patch, slug })
  }

  function getFinishes(card: CardRow): Finish[] {
    if (!card.matchedCard) return ['Standard', 'Foil', 'Rainbow']
    const setData = card.matchedCard.sets.find(s => s.n === card.setName)
      ?? card.matchedCard.sets[card.matchedCard.sets.length - 1]
    const finishes = [...new Set(setData?.v.map(v => v.finish as Finish) ?? ['Standard', 'Foil'])]
    if (!finishes.includes('Standard')) finishes.unshift('Standard')
    return finishes
  }

  return (
    <div className="panel fade-in">
      <div className="panel-header">
        <span className="panel-title">Review & Edit Cards</span>
        <div className="flex items-center gap-3">
          <span className="text-text-dim text-xs">
            {cards.length} cards · {matched} matched
            {unmatched > 0 && <span className="text-danger ml-1">· {unmatched} unmatched</span>}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
          <button className="btn btn-primary" onClick={() => setStep(3)}>Listing Info →</button>
        </div>
      </div>

      {unmatched > 0 && (
        <div className="px-5 pt-4">
          <div className="notice notice-error">
            ⚠ {unmatched} card{unmatched > 1 ? 's' : ''} could not be matched — please review below.
          </div>
        </div>
      )}

      {/* Price source attribution */}
      {hasPrices && (
        <div className="px-5 pt-3">
          <div className="notice notice-info py-2">
            <span>💰</span>
            <span className="text-xs">
              Market prices courtesy of{' '}
              <a
                href={priceData!.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                {priceData!.source}
              </a>
              {' '}· Updated {new Date(priceData!.updated).toLocaleDateString()}
              {' '}· Prices are NM baseline adjusted for condition. Override any price manually.
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Qty', 'Card Name', 'Set', 'Rarity', 'Finish', 'Cond.', 'Market', 'Price (USD)', ''].map(h => (
                <th key={h} className="font-cinzel text-[0.6rem] tracking-widest text-text-dim uppercase px-3 py-2 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              const name      = card.matchedCard?.name ?? card.rawName
              const sets      = card.matchedCard?.sets ?? []
              const finishes  = getFinishes(card)
              const rowBg     = !card.matched && card.rawName ? 'bg-danger/5' : ''
              const priceLookup = getPrice(card.slug)
              const adjMarket = priceLookup
                ? parseFloat((priceLookup.market * CONDITION_MULTIPLIER[card.condition]).toFixed(2))
                : null
              const isAutoPrice = card.price === '' && adjMarket !== null

              return (
                <tr key={card.id} className={`border-b border-border/40 hover:bg-white/[0.02] ${rowBg}`}>

                  {/* Qty */}
                  <td className="px-3 py-2">
                    <input
                      type="number" min={1} max={99} value={card.qty}
                      onChange={e => updateCard(card.id, { qty: parseInt(e.target.value) || 1 })}
                      className="table-input w-12 text-center"
                    />
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2 min-w-[200px]">
                    {card.matched ? (
                      <CardHover slug={card.slug}>
                        <div className="font-semibold text-text-primary">{name}</div>
                      </CardHover>
                    ) : (
                      <>
                        {card.rawName && (
                          <div className="font-semibold text-danger mb-1">{card.rawName}</div>
                        )}
                        {card.suggestions[0] && (
                          <div
                            className="text-amber text-xs mb-1 cursor-pointer hover:underline"
                            onClick={() => acceptSuggestion(card, card.suggestions[0])}
                          >
                            Did you mean: <em>{card.suggestions[0]}</em>?
                          </div>
                        )}
                        <input
                          type="text"
                          className="table-input w-full text-xs"
                          placeholder="Type card name…"
                          defaultValue={card.rawName}
                          onChange={e => updateCard(card.id, { rawName: e.target.value })}
                          onBlur={() => handleRematch(card)}
                        />
                      </>
                    )}
                  </td>

                  {/* Set */}
                  <td className="px-3 py-2">
                    {sets.length > 0 ? (
                      <select
                        className="table-select text-xs"
                        value={card.setName}
                        onChange={e => handleSetOrFinishChange(card, { setName: e.target.value })}
                      >
                        {sets.map(s => <option key={s.n} value={s.n}>{s.n}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="table-input text-xs w-28"
                        placeholder="Set name…"
                        value={card.setName}
                        onChange={e => updateCard(card.id, { setName: e.target.value })}
                      />
                    )}
                  </td>

                  {/* Rarity */}
                  <td className="px-3 py-2">
                    {card.matchedCard?.rarity
                      ? <RarityBadge rarity={card.matchedCard.rarity} />
                      : <span className="text-text-dim">—</span>}
                  </td>

                  {/* Finish */}
                  <td className="px-3 py-2">
                    <select
                      className="table-select text-xs"
                      value={card.finish}
                      onChange={e => handleSetOrFinishChange(card, { finish: e.target.value as Finish })}
                    >
                      {finishes.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </td>

                  {/* Condition */}
                  <td className="px-3 py-2">
                    <select
                      className="table-select text-xs"
                      value={card.condition}
                      onChange={e => updateCard(card.id, { condition: e.target.value as Condition })}
                    >
                      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>

                  {/* Market price (read-only reference) */}
                  <td className="px-3 py-2">
                    {adjMarket !== null ? (
                      <span className="text-text-secondary text-xs font-mono">
                        ${adjMarket.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-text-dim text-xs">—</span>
                    )}
                  </td>

                  {/* Price override */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim font-cinzel text-xs pointer-events-none">$</span>
                      <input
                        type="number" min={0} step={0.01}
                        value={card.price}
                        placeholder={adjMarket !== null ? adjMarket.toFixed(2) : '0.00'}
                        onChange={e => updateCard(card.id, { price: e.target.value })}
                        className={`table-input pl-5 w-24 ${isAutoPrice ? 'text-text-dim italic' : ''}`}
                      />
                    </div>
                    {isAutoPrice && (
                      <div className="text-[0.55rem] text-text-dim mt-0.5 pl-1">auto</div>
                    )}
                  </td>

                  {/* Remove */}
                  <td className="px-3 py-2">
                    <button className="btn btn-danger btn-sm" onClick={() => removeCard(card.id)}>✕</button>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={addRow}>+ Add Card</button>
          {hasPrices && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={fillFromMarket}
              title="Copy market prices into all blank price fields"
            >
              ↓ Fill from market
            </button>
          )}
        </div>
        <div className="font-cinzel text-xs text-text-secondary">
          Estimated Total{' '}
          <span className="text-gold font-semibold ml-2">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}