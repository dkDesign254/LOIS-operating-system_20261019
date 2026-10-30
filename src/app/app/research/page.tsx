import { requireWorkspace } from '@/lib/session'
import { researchEnabled } from '@/lib/research'
import { ResearchForm } from '@/components/research-form'

export const metadata = { title: 'Web research' }

export default async function Research() {
  await requireWorkspace()
  return (
    <div className="stack">
      <div><h1>Web research</h1><p className="muted">Ask about anything outside your own knowledge. LOIS searches the web, summarises, and lists the pages it used. It prepares and you decide: nothing is saved or acted on unless you choose to propose it.</p></div>
      <ResearchForm enabled={researchEnabled()} />
    </div>
  )
}
