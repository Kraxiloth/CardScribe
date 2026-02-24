import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { parseCardList } from '@/utils/parser'
import { findCard, getSuggestions } from '@/data'
import { showToast } from '@/components/Toast'
import type { CardRow, Condition, Finish } from '@/types'

const EXAMPLE = `2x Abaddon Succubus Gothic Elite Foil NM
1 Dragon King Alpha Unique NM
4x Spire Ordinary NM
1 Avalon Arthurian Elite Foil NM
2x Camelot Arthurian Legends Unique LP
3 Apprentice Wizard Beta Standard NM
1x Black Knight Gothic Exceptional Foil NM`

export function StepPaste() {
  const [text, setText] = useState('')
  const setCards = useStore(s => s.setCards)
  const setStep  = useStore(s => s.setStep)

  function handleParse() {
    if (!text.trim()) {
      showToast('Please paste some cards first')
      return
    }

    const parsed = parseCardList(text)
    if (!parsed.length) {
      showToast('Could not parse any cards — check the format')
      return
    }

    const rows: CardRow[] = parsed.map(p => {
      const match = findCard(p.rawName, p.setName)
      const suggestions = match ? [] : getSuggestions(p.rawName)

      const setName = (() => {
        if (p.setName) return p.setName
        if (match) return match.sets[match.sets.length - 1].n
        return ''
      })()

      return {
        id: Math.random().toString(36).slice(2),
        rawLine: p.rawName,
        rawName: p.rawName,
        qty: p.qty,
        condition: p.condition as Condition,
        finish: p.finish as Finish,
        setName,
        matched: !!match,
        matchedCard: match,
        suggestions,
        price: '',
      }
    })

    setCards(rows)
    setStep(2)
  }

  return (
    <div className="panel fade-in">
      <div className="panel-header">
        <span className="panel-title">Paste Your Card List</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setText(EXAMPLE)}>
            Load Example
          </button>
          <button className="btn btn-primary" onClick={handleParse}>
            Parse →
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="notice notice-info mb-4">
          <span>📜</span>
          <span>
            Paste your cards one per line. CardScribe understands most formats — quantity, name, set,
            condition, and finish. Try things like:{' '}
            <em>2x Abaddon Succubus Gothic Elite Foil NM</em> or{' '}
            <em>1 Dragon King (Alpha) Unique</em>
          </span>
        </div>

        <textarea
          className="form-input resize-y"
          style={{ minHeight: '160px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.6 }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`2x Abaddon Succubus Gothic Elite Foil NM\n1 Dragon King Alpha Unique NM\n4x Spire Ordinary NM`}
        />

        <div className="flex justify-between items-center mt-2">
          <span className="text-text-dim text-sm italic">
            Supports: quantity · card name · set · condition (NM/LP/MP/HP/DMG) · finish (Foil/Rainbow)
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setText('')}>
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
