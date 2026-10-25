'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// A small floating "Ask LOIS" button with a rotating suggestion that fits the page you are on. Click to ask it; dismiss to hide for this visit.
const BY_PAGE: Record<string, string[]> = {
  '/app/knowledge': ['What do our documents say about pricing?', 'Which of my documents are out of date?'],
  '/app/bank': ['What have we already approved about onboarding?', 'Is there anything that contradicts this entry?'],
  '/app/readiness': ['What should I fix first on my website?', 'Explain structured data in plain words.'],
  '/app/intake': ['Summarise what I just uploaded.', 'What is missing from our knowledge on refunds?'],
  '/app/sandbox': ['What would LOIS recommend for this scenario?', 'What evidence would change the answer?'],
  '/app/help': ['What questions keep coming up?', 'Draft a reply based on our approved knowledge.'],
}
const DEFAULT = ['What are you trying to solve?', 'Where would a person decide here?']

export function AskLauncher() {
  const path = usePathname()
  const [i, setI] = useState(0)
  const [hidden, setHidden] = useState(false)
  useEffect(() => { try { setHidden(sessionStorage.getItem('lois_launcher') === '0') } catch {} }, [])
  const list = Object.entries(BY_PAGE).find(([k]) => path.startsWith(k))?.[1] ?? DEFAULT
  useEffect(() => {
    if (hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => n + 1), 6500)
    return () => clearInterval(t)
  }, [hidden])
  if (path === '/app' || hidden) return null
  const q = list[i % list.length]
  return (
    <div className="launcher">
      <div className="bubble">
        <Link href={`/app?q=${encodeURIComponent(q)}`} aria-label={`Ask LOIS: ${q}`}>
          <span className="mono tiny">TRY ASKING</span>
          <span>&ldquo;{q}&rdquo;</span>
        </Link>
        <button type="button" aria-label="Hide suggestions" onClick={() => { setHidden(true); try { sessionStorage.setItem('lois_launcher', '0') } catch {} }}>×</button>
      </div>
    </div>
  )
}
