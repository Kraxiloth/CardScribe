import { useEffect, useRef, useState } from 'react'

// Simple event bus for toast messages
type ToastListener = (msg: string) => void
const listeners: ToastListener[] = []

export function showToast(msg: string) {
  listeners.forEach(l => l(msg))
}

export function Toast() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler: ToastListener = (msg) => {
      setMessage(msg)
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 2800)
    }
    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  return (
    <div
      className="fixed bottom-8 right-8 z-50 pointer-events-none font-cinzel text-[0.7rem] tracking-wider text-gold border border-gold rounded px-5 py-3 transition-all duration-300"
      style={{
        background: 'var(--bg-raised)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      {message}
    </div>
  )
}
