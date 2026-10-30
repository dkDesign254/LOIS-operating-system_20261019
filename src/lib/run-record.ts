import { pickFrameworks, type Framework } from './frameworks.ts'
import type { UseCase } from './use-cases.ts'

export type RunRecord = {
  what: string; when: string; why: string; how: string; expect: string; measure: string
  accuracy: { level: 'simulated' | 'reported' | 'verified'; note: string }
  steps: { name: string; kind: string; does: string; produces: string; state: 'simulated' | 'pending' | 'done' }[]
  effects: string[]; options: string[]; learn: string[]
  frameworks: Framework[]
}

const nairobi = () => new Date(Date.now() + 3 * 3600_000).toISOString().replace('T', ' ').slice(0, 16) + ' (Nairobi)'

/** Plain-language account of a run, built before and after it happens. Rule-based, so every line can be traced to the template. */
export function buildRecord(u: UseCase, mode: 'test' | 'live', configMode: 'standard' | 'custom', config: Record<string, unknown>, input: Record<string, string>, why: string): RunRecord {
  const cfg = Object.entries(config).map(([k, v]) => `${k}: ${v}`).join('; ')
  const inp = Object.entries(input).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('; ')
  const test = mode === 'test'
  return {
    what: `${test ? 'Test run' : 'Live run'} of "${u.title}" using the ${configMode} configuration${inp ? ` with: ${inp}` : ''}.`,
    when: nairobi(),
    why: why || (test ? 'To see how this works before using real information.' : 'Requested by a team member.'),
    how: `${u.steps.length} steps: ${u.steps.map((s) => s.name).join(' → ')}. Settings: ${cfg || 'none'}.`,
    expect: test ? 'Nothing real happens. You will see what each step would do, with example output.' : u.expectation,
    measure: u.measure,
    accuracy: test
      ? { level: 'simulated', note: 'Example output built from the template and what you typed. It shows the shape of the result, not real results. Nothing was sent, posted or created.' }
      : { level: 'reported', note: 'Anything your automation reports back is labelled "reported" until a person checks it against the platform or system it came from.' },
    steps: u.steps.map((s) => ({ name: s.name, kind: s.kind, does: s.does, produces: s.produces, state: test ? 'simulated' : s.kind === 'person' ? 'pending' : 'pending' })),
    effects: test
      ? ['No outside system was touched.', 'This run counts against today\'s test allowance.']
      : u.steps.filter((s) => s.outward).map((s) => `${s.name}: ${s.does} ${s.reversible === false ? 'This cannot be taken back once sent.' : ''}`),
    options: test
      ? ['Change the configuration and run again.', 'Request a live run (needs an enabled connector and a second person\'s approval).', 'Save what you learned to the Knowledge bank for review.']
      : ['Approve or reject (a different person from the requester).', 'Ask an admin to reject it if you change your mind.', 'After it runs: record the result, save the learning, or run again with changes.'],
    learn: ['What would make this worth doing? Write the number before you run it.', 'Which step would you check twice?'],
    frameworks: pickFrameworks({ outward: u.outward, reversible: u.reversible, mode, hasCost: u.slug === 'orders-and-invoicing' }),
  }
}

/** Example output for each internal step in a test run, built only from what was typed. Labelled as examples in the screen. */
export function simulate(u: UseCase, input: Record<string, string>): { step: string; example: string }[] {
  const v = (k: string) => input[k]?.trim() || `(your ${k})`
  const by: Record<string, Record<string, string>> = {
    'social-media-management': {
      brief: `Voice for ${v('business')}: speak to ${v('audience')}; goal: ${v('goal')}.`,
      plan: 'Mon: tip · Tue: behind the scenes · Wed: customer story · Thu: tip · Fri: offer reminder.',
      draft: `Draft 1 (example): "Here is one thing ${v('business')} does to help ${v('audience')}: ${v('offer')}."`,
      learn: 'Example summary: 5 posts planned; 0 published because this is a test.',
    },
    'orders-and-invoicing': {
      intake: `Order read for ${v('customer')}: ${v('items')}.`,
      quote: `Draft quote for about ${v('amount')} with terms from your configuration.`,
      followup: 'Reminder draft: "A friendly reminder that invoice (number) is due on (date)."',
    },
    'lead-capture-and-follow-up': {
      score: `Lead ${v('name')}: budget ${v('budget')}; reasons shown with the score.`,
      draft: `Reply draft (example) to ${v('name')} about: ${v('message')}.`,
      track: 'Outcome would be recorded here; a learning would be proposed to the Knowledge bank.',
    },
  }
  return u.steps.map((s) => ({ step: s.name, example: s.kind === 'internal' ? by[u.slug]?.[s.key] ?? s.produces : s.kind === 'person' ? 'A named approver decides here. In a test run no one is asked.' : 'Would go through your connector. Not sent in a test run.' }))
}
