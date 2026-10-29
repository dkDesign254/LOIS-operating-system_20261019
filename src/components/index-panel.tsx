'use client'
import { useActionState } from 'react'
import { rebuildIndex, type IndexState } from '@/app/app/bank/actions'
import { SubmitButton } from './submit-button'

export function IndexPanel({ missing, total }: { missing: number; total: number }) {
  const [s, act] = useActionState<IndexState, FormData>(async (p) => rebuildIndex(p), null)
  return (
    <form action={act} className="callout">
      <p style={{ margin: 0 }}><b>Search index:</b> {total - missing} of {total} accepted entries are indexed for meaning search{missing ? `; ${missing} are not.` : '.'} Without it, answers fall back to word matching.</p>
      {missing > 0 && <SubmitButton className="btn small" pendingText="Indexing…">Index now</SubmitButton>}
      <div aria-live="polite">
        {s?.message && <p className="ok" role="status">{s.message}</p>}
        {s?.error && <p className="err" role="alert">{s.error}</p>}
      </div>
    </form>
  )
}
