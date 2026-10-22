import { headers } from 'next/headers'
import { requireWorkspace } from '@/lib/session'
import { SandboxForm } from '@/components/forms'
import { DemoCard } from '@/components/control'
import { DEMOS } from '@/lib/learn'
import { llmEnabled } from '@/lib/llm'
import { sandboxRun } from '../actions'
import { rateDemo } from '../control-actions'

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

      <div>
        <h2>Seven simple tools to try</h2>
        <p className="muted">Small, real examples of AI doing useful business work. Each shows how it would be automated in Make. What you type is sent to an AI model, so use sample or anonymised text: no passwords, ID numbers or customer secrets. Everything here is a simulation and nothing connects to live systems.{llmEnabled() ? '' : ' Running the tools needs an AI key, which is not set (this keeps the app free), but you can still read each flow and copy its instruction.'}</p>
      </div>
      <div className="grid two">
        {DEMOS.map((d) => <DemoCard key={d.id} demo={d} rate={rateDemo} />)}
      </div>

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
