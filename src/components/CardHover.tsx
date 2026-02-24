import { useState, useRef, useCallback, useEffect } from 'react'

const CDN_BASE = 'https://d27a44hjr9gen3.cloudfront.net/cards'

interface CardHoverProps {
  slug: string | null
  children: React.ReactNode
}

export function CardHover({ slug, children }: CardHoverProps) {
  const [visible, setVisible] = useState(false)
  const [imgOk, setImgOk]     = useState<boolean | null>(null)
  const [pos, setPos]         = useState({ x: 0, y: 0 })
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const imageUrl = slug ? `${CDN_BASE}/${slug}.png` : null

  useEffect(() => {
    setImgOk(null)
    setVisible(false)
  }, [slug])

  const show = useCallback((e: React.MouseEvent) => {
    if (!imageUrl) return
    setPos({ x: e.clientX, y: e.clientY })
    timerRef.current = setTimeout(() => setVisible(true), 250)
  }, [imageUrl])

  const move = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY })
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  const CARD_W = 200
  const CARD_H = 280
  const OFFSET = 18
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  let left = pos.x + OFFSET
  let top  = pos.y - CARD_H / 2
  if (left + CARD_W > vw - 8) left = pos.x - CARD_W - OFFSET
  if (top < 8)                 top  = 8
  if (top + CARD_H > vh - 8)  top  = vh - CARD_H - 8

  // Render regardless of slug — show debug border when no slug
  return (
    <>
      <div
        onMouseEnter={show}
        onMouseMove={move}
        onMouseLeave={hide}
        style={{
          display: 'block',
          width: '100%',
          outline: slug ? '1px dashed rgba(201,168,76,0.3)' : '1px dashed rgba(255,0,0,0.3)',
        }}
      >
        {children}
      </div>

      {visible && imageUrl && (
        <div
          style={{
            position:      'fixed',
            left,
            top,
            width:         CARD_W,
            zIndex:        9999,
            pointerEvents: 'none',
            opacity:       imgOk === true ? 1 : 0.01,
            transition:    'opacity 0.12s ease',
          }}
        >
          <img
            src={imageUrl}
            alt=""
            width={CARD_W}
            draggable={false}
            style={{
              display:      'block',
              borderRadius: 10,
              boxShadow:    '0 8px 32px rgba(0,0,0,0.75), 0 0 0 1px rgba(201,168,76,0.25)',
            }}
            onLoad={()  => { console.log('Image loaded:', imageUrl); setImgOk(true) }}
            onError={() => { console.log('Image error:', imageUrl); setImgOk(false) }}
          />
        </div>
      )}
    </>
  )
}