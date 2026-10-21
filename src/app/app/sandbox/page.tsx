import { headers } from 'next/headers'
import { requireWorkspace } from '@/lib/session'
import { SandboxForm } from '@/components/forms'
import { sandboxRun } from '../actions'

export const metadata = { title: 'Sandbox' }

export default async function Sandbox() {
  await requireWorkspace()
  const host = (await headers()).get('host') ?? 'your-app.vercel.app'
  return (
    <div className="stack">
      <div>
        <h1>Sandbox</h1>
        <p className="muted">
          Try a scenario against your approved knowledge and see exactly what LOIS would find and recommend. This is a simulation: it saves nothing, spends no daily question, and never executes anything.
        </p>
      </div>

      <SandboxForm action={sandboxRun} />

      <div className="card soft">
        <h2>Same thing over the API</h2>
        <p className="muted small">Create a key under Integrations, then:</p>
        <pre>{`curl -s https://${host}/api/v1/search \\
  -H "Authorization: Bearer $LOIS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"quick fix or proper fix","limit":5}'`}</pre>
      </div>
    </div>
  )
}
