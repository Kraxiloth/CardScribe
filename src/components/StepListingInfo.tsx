import { useStore } from '@/hooks/useStore'
import { calcTotal } from '@/utils/adGenerator'
import type { ListingType } from '@/types'

const PAYMENT_OPTIONS = [
  'PayPal F&F', 'PayPal G&S', 'Venmo', 'CashApp', 'Wise', 'Bank Transfer', 'Crypto',
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'NOK', 'SEK', 'DKK']

export function StepListingInfo() {
  const cards          = useStore(s => s.cards)
  const listingType    = useStore(s => s.listingType)
  const sellerInfo     = useStore(s => s.sellerInfo)
  const setListingType = useStore(s => s.setListingType)
  const setSellerInfo  = useStore(s => s.setSellerInfo)
  const setStep        = useStore(s => s.setStep)

  const total = calcTotal(cards)
  const isSelling = listingType === 'selling'
  const isBuying  = listingType === 'buying'
  const isTrading = listingType === 'trading'

  function togglePayment(method: string) {
    const current = sellerInfo.paymentMethods
    setSellerInfo({
      paymentMethods: current.includes(method)
        ? current.filter(m => m !== method)
        : [...current, method],
    })
  }

  const TYPES: { key: ListingType; label: string; icon: string }[] = [
    { key: 'selling', label: 'Selling', icon: '⚔' },
    { key: 'buying',  label: 'Buying',  icon: '🛒' },
    { key: 'trading', label: 'Trading', icon: '⇄' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="panel fade-in">
        <div className="panel-header">
          <span className="panel-title">Listing Details</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2 mb-5">
            {TYPES.map(t => (
              <button
                key={t.key}
                className={`type-btn ${listingType === t.key ? 'active' : ''}`}
                onClick={() => setListingType(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="form-label">
              Discord Username <span className="text-amber">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="@username or Name#0000"
              value={sellerInfo.discord}
              onChange={e => setSellerInfo({ discord: e.target.value })}
            />
          </div>

          {(isSelling || isBuying) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="form-label">
                  Currency <span className="text-amber">*</span>
                </label>
                <select
                  className="form-select"
                  value={sellerInfo.currency}
                  onChange={e => setSellerInfo({ currency: e.target.value })}
                >
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Open to Offers?</label>
                <div className="flex items-center gap-2 mt-2">
                  <label className="relative w-9 h-5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={sellerInfo.openToOffers}
                      onChange={e => setSellerInfo({ openToOffers: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span className="text-text-secondary text-sm">Yes</span>
                </div>
              </div>
            </div>
          )}

          {(isSelling || isBuying) && (
            <div className="mb-4">
              <label className="form-label">
                Payment Methods <span className="text-amber">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_OPTIONS.map(m => (
                  <button
                    key={m}
                    className={`chip ${sellerInfo.paymentMethods.includes(m) ? 'active' : ''}`}
                    onClick={() => togglePayment(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(isSelling || isTrading) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="form-label">Ships From</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Norway, US"
                  value={sellerInfo.shipsFrom}
                  onChange={e => setSellerInfo({ shipsFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Ships To</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Worldwide, EU only"
                  value={sellerInfo.shipsTo}
                  onChange={e => setSellerInfo({ shipsTo: e.target.value })}
                />
              </div>
            </div>
          )}

          {isTrading && (
            <div className="mb-4">
              <label className="form-label">My Offer</label>
              <textarea
                className="form-input resize-y"
                style={{ minHeight: '80px' }}
                placeholder="List what you're offering in trade…"
                value={sellerInfo.tradeOffer}
                onChange={e => setSellerInfo({ tradeOffer: e.target.value })}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="form-label">Comments</label>
            <input
              type="text"
              className="form-input"
              placeholder="Optional notes, trade interests, etc."
              value={sellerInfo.comments}
              onChange={e => setSellerInfo({ comments: e.target.value })}
            />
          </div>

          {total >= 250 && (
            <div className="notice notice-warn mb-4">
              ⚠ Items over $250 require a photo with your Discord name and date visible.
              Please attach this to your listing post.
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Generate Ad →</button>
          </div>
        </div>
      </div>

      <div className="panel fade-in">
        <div className="panel-header">
          <span className="panel-title">Card Summary</span>
          {total > 0 && (
            <span className="font-cinzel text-xs text-gold">
              {sellerInfo.currency} ${total.toFixed(2)}
            </span>
          )}
        </div>
        <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
          {Object.entries(
            cards.reduce<Record<string, typeof cards>>((acc, c) => {
              const key = c.setName || 'Unknown Set'
              acc[key] = [...(acc[key] ?? []), c]
              return acc
            }, {})
          ).map(([setName, setCards]) => (
            <div key={setName}>
              <div className="font-cinzel text-[0.6rem] tracking-widest text-text-dim uppercase mb-2">
                {setName}
              </div>
              {setCards.map(c => {
                const name = c.matchedCard?.name ?? c.rawName
                const rarity = c.matchedCard?.rarity
                return (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border/40 text-sm">
                    <span className="text-text-dim w-6 text-right shrink-0">{c.qty}×</span>
                    <span className="flex-1 font-semibold">{name}</span>
                    {rarity && (
                      <span className="rarity-badge text-[0.5rem]" style={{
                        color: rarity === 'Ordinary' ? '#8a9aaa' : rarity === 'Exceptional' ? '#6aaa6a' : rarity === 'Elite' ? '#9a6aee' : '#e8a040',
                        borderColor: rarity === 'Ordinary' ? 'rgba(138,154,170,0.3)' : rarity === 'Exceptional' ? 'rgba(106,170,106,0.3)' : rarity === 'Elite' ? 'rgba(154,106,238,0.3)' : 'rgba(232,160,64,0.3)',
                      }}>
                        {rarity}
                      </span>
                    )}
                    {c.finish !== 'Standard' && (
                      <span className="finish-badge text-[0.5rem]" style={{
                        color: c.finish === 'Foil' ? '#7adde8' : '#e87ad8',
                        borderColor: c.finish === 'Foil' ? 'rgba(122,221,232,0.3)' : 'rgba(232,122,216,0.3)',
                      }}>
                        {c.finish}
                      </span>
                    )}
                    <span className="text-text-dim shrink-0">{c.condition}</span>
                    {c.price && (
                      <span className="text-gold shrink-0">${parseFloat(c.price).toFixed(2)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
