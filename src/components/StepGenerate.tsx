import { useMemo } from 'react'
import { useStore } from '@/hooks/useStore'
import { generateAd } from '@/utils/adGenerator'
import { showToast } from '@/components/Toast'

function renderDiscordMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}

export function StepGenerate() {
  const cards        = useStore(s => s.cards)
  const listingType  = useStore(s => s.listingType)
  const sellerInfo   = useStore(s => s.sellerInfo)
  const outputTab    = useStore(s => s.outputTab)
  const setOutputTab = useStore(s => s.setOutputTab)
  const setStep      = useStore(s => s.setStep)

  const ad = useMemo(
    () => generateAd(cards, listingType, sellerInfo),
    [cards, listingType, sellerInfo]
  )

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(ad)
      showToast('Copied to clipboard!')
    } catch {
      showToast('Could not copy — please select and copy manually')
    }
  }

  return (
    <div className="panel fade-in">
      <div className="panel-header">
        <span className="panel-title">Generated Ad</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>← Edit</button>
          <button
            className={`btn btn-sm ${outputTab === 'raw' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setOutputTab('raw')}
          >
            Raw
          </button>
          <button
            className={`btn btn-sm ${outputTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setOutputTab('preview')}
          >
            Preview
          </button>
          <button className="btn btn-primary" onClick={copyToClipboard}>
            Copy to Clipboard
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="notice notice-info mb-4">
          📋 Your Discord-ready listing is below. Switch to <strong>Preview</strong> to see
          how it will render, then hit <strong>Copy</strong> and paste directly into Discord.
        </div>

        {outputTab === 'raw' && (
          <pre
            className="rounded border border-border p-4 text-text-secondary text-sm leading-relaxed overflow-y-auto max-h-[480px] whitespace-pre-wrap"
            style={{ background: 'var(--bg-dark)', fontFamily: 'Courier New, monospace' }}
          >
            {ad}
          </pre>
        )}

        {outputTab === 'preview' && (
          <div
            className="rounded p-4 text-sm leading-relaxed overflow-y-auto max-h-[480px]"
            style={{
              background: '#313338',
              color: '#dbdee1',
              fontFamily: "'gg sans', 'Noto Sans', system-ui, sans-serif",
            }}
            dangerouslySetInnerHTML={{ __html: renderDiscordMarkdown(ad) }}
          />
        )}
      </div>
    </div>
  )
}
