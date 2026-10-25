'use client'
import { useEffect, useRef, useState } from 'react'

// Fades content up as it scrolls into view. Content is visible without script and for reduced-motion users.
export function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'armed' | 'in'>('idle')
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight * 0.9) return
    setState('armed')
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setState('in'); io.disconnect() } }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${state} ${className}`}>{children}</div>
}
