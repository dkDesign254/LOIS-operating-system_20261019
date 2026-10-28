'use client'
import { useEffect, useState } from 'react'

// Reads the briefing aloud using the voice built into the person's own browser. Nothing is uploaded and it costs nothing.
export function SpeakButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  const [on, setOn] = useState(false)
  useEffect(() => { setOk(typeof window !== 'undefined' && 'speechSynthesis' in window); return () => { try { window.speechSynthesis?.cancel() } catch {} } }, [])
  if (!ok) return <p className="muted small">Voice is not available in this browser. The text above has everything.</p>
  function toggle() {
    const s = window.speechSynthesis
    if (on) { s.cancel(); setOn(false); return }
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1
    u.onend = () => setOn(false)
    u.onerror = () => setOn(false)
    setOn(true)
    s.speak(u)
  }
  return <button type="button" className="btn ghost small" onClick={toggle} aria-pressed={on}>{on ? 'Stop' : 'Listen'}</button>
}
