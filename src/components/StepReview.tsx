import { useStore } from '@/hooks/useStore'
import { findCard, getSuggestions } from '@/data'
import { showToast } from '@/components/Toast'
import type { CardRow, Condition, Finish } from '@/types'

const CONDITIONS: Condition[] = ['NM', 'LP', 'MP', 'HP', 'DMG']

function RarityBadge({ rarity }: { rarity: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Ordinary:    { color: '#8a9aaa', borderColor: 'rgba(138,154,170,0.3)', background: 'rgba(138,154,170,0.08)' },
    Exceptional: { color: '#6aaa6a', borderColor: 'rgba(106,170,106,0.3)', background: 'rgba(106,170,106,0.08)' },
    Elite:       { color: '#9a6aee', borderColor: 'rgba(154,106,238,0.3)', background: 'rgba(154,106,238,0.08)' },
    Unique:      { color: '#e8a040', borderColor: 'rgba(232,160,64,0.3)',  background: 'rgba(232,160,64,0.08)'  },
  }
  return (
    <span className="rarity-badge" style={styles[rarity] ?? {}}>
      {rarity}
    </span>
  )
}

function FinishBadge({ finish }: { finish: Finish }) {
  if (finish === 'Standard') return null
  const style: React.CSSProperties = finish === 'Foil'
    ? { color: '#7adde8', borderColor: 'rgba(122,221,232,0.3)', background: 'rgba(122,221,232,0.07)' }
    : { color: '#e87ad8', borderColor: 'rgba(232,122,216,0.3)', background: 'rgba(232,122,216,0.07)' }
  return <span className="finish-badge" style={style}>{finish}</span>
}

function blankRow(): CardRow {
  return {
    id: Math.random().toString(36).slice(2),
    rawLine: '',
    rawName: '',
    qty: 1,
    condition: 'NM',
    finish: 'Standard',
    setName: '',
    matched: false,
    matchedCard: null,
    suggestions: [],
    price: '',
  }
}

export function StepReview() {
  const cards      = useStore(s => s.cards)
  const setCards   = useStore(s => s.setCards)
  const updateCard = useStore(s => s.updateCard)
  const removeCard = useStore(s => s.removeCard)
  const setStep    = useStore(s => s.setStep)

  const total     = cards.reduce((sum, c) => sum + (parseFloat(c.price) || 0) * (c.qty || 1), 0)
  const unmatched = cards.filter(c => !c.matched).length
  const matched   = cards.filter(c => c.matched).length

  function addRow() {
    setCards([...cards, blankRow()])
  }

  function handleRematch(card: CardRow) {
    const match = findCard(card.rawName)
    if (match) {
      updateCard(card.id, {
        matched: true,
        matchedCard: match,
        setName: card.setName || match.sets[match.sets.length - 1].n,
        suggestions: [],
      })
      showToast(`Matched: ${match.name}`)
    } else {
      showToast('Still no match — try correcting the name further')
    }
  }

  function acceptSuggestion(card: CardRow, suggestion: string) {
    const match = findCard(suggestion)
    updateCard(card.id, {
      rawName: suggestion,
      matched: !!match,
      matchedCard: match,
      suggestions: match ? [] : getSuggestions(suggestion),
      setName: match ? match.sets[match.sets.length - 1].n : card.setName,
    })
  }

  function getFinishes(card: CardRow): Finish[] {
    if (!card.matchedCard) return ['Standard', 'Foil', 'Rainbow']
    const setData = card.matchedCard.sets.find(s => s.n === card.setName)
      ?? card.matchedCard.sets[card.matchedCard.sets.length - 1]
    const finishes = [...new Set(setData?.v.map(v => v.finish as Finish) ?? ['Standard', 'Foil'])]
    if (!finishes.includes('Standard')) finishes.unshift('Standard')
    return finishes
  }

  function getAvailableSets(card: CardRow) {
    return card.matchedCard?.sets ?? []
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Qty', 'Card Name', 'Set', 'Rarity', 'Finish', 'Condition', 'Price (USD)', ''].map(h => (
                <th key={h} className="font-cinzel text-[0.6rem] tracking-widest text-text-dim uppercase px-3 py-2 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              const name     = card.matchedCard?.name ?? card.rawName
              const sets     = getAvailableSets(card)
              const finishes = getFinishes(card)
              const rowBg    = !card.matched && card.rawName ? 'bg-danger/5' : ''

              return (
                <tr key={card.id} className={`border-b border-border/40 hover:bg-white/[0.02] ${rowBg}`}>

                  {/* Qty */}
                  <td className="px-3 py-2">
                    <input
                      type="number" min={1} max={99}
                      value={card.qty}
                      onChange={e => updateCard(card.id, { qty: parseInt(e.target.value) || 1 })}
                      className="table-input w-12 text-center"
                    />
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2 min-w-[200px]">
                    {card.matched ? (
                      <div className="font-semibold text-text-primary">{name}</div>
                    ) : (
                      <>
                        {card.rawName && (
                          <div className="font-semibold text-danger mb-1">{card.rawName || 'New card'}</div>
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
                        onChange={e => updateCard(card.id, { setName: e.target.value })}
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
                      onChange={e => updateCard(card.id, { finish: e.target.value as Finish })}
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

                  {/* Price */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim font-cinzel text-xs pointer-events-none">$</span>
                      <input
                        type="number" min={0} step={0.01}
                        value={card.price}
                        placeholder="0.00"
                        onChange={e => updateCard(card.id, { price: e.target.value })}
                        className="table-input pl-5 w-20"
                      />
                    </div>
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

      {/* Footer: Add row + total */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-border">
        <button className="btn btn-ghost btn-sm" onClick={addRow}>
          + Add Card
        </button>
        <div className="font-cinzel text-xs text-text-secondary">
          Estimated Total <span className="text-gold font-semibold ml-2">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}