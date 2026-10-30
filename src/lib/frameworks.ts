// Decision frameworks LOIS teaches while a person decides. Each is a short, widely used way of thinking, described in LOIS's own words.
// The point is not to name-drop: each comes with the question it asks about THIS run.
export type Framework = { id: string; name: string; origin: string; when: string; ask: string[]; lesson: string }

export const FRAMEWORKS: Record<string, Framework> = {
  doors: { id: 'doors', name: 'One-way or two-way door', origin: 'Popularised in Amazon leadership writing', when: 'Before anything that reaches other people.', ask: ['If this goes wrong, can we undo it quickly and cheaply?', 'If not, who has agreed to carry the risk?'], lesson: 'Reversible decisions can be made fast by one person. Hard-to-reverse ones deserve more evidence and a second pair of eyes.' },
  premortem: { id: 'premortem', name: 'Pre-mortem', origin: 'Gary Klein', when: 'Before approving a live run.', ask: ['Imagine this failed badly in a month. What is the most likely reason?', 'What would we have wished we had checked today?'], lesson: 'Asking "why did it fail" before it happens surfaces risks that optimism hides.' },
  daci: { id: 'daci', name: 'DACI roles', origin: 'Widely used in product and operations teams', when: 'When more than one person is involved.', ask: ['Who is the Driver, the Approver, who Contributes, who is Informed?', 'Is the approver a different person from the requester?'], lesson: 'Most decisions stall or go wrong because nobody is clearly the approver. LOIS makes the approver a different person on purpose.' },
  roi: { id: 'roi', name: 'Cost, benefit and payback', origin: 'Standard managerial finance', when: 'When the run costs time, money or goodwill.', ask: ['What does this cost in money, hours and attention?', 'What would we have to see to call it worth it, and by when?'], lesson: 'Write the success number before you run, not after. Otherwise any result looks like a win.' },
  evidence: { id: 'evidence', name: 'Evidence ladder', origin: 'Evidence-based management', when: 'Whenever a number or claim drives the choice.', ask: ['Is this verified, reported, or an example?', 'Who measured it, and how recently?'], lesson: 'A claim from the connector is "reported" until someone checks it. LOIS labels it that way so it is not mistaken for fact.' },
  ooda: { id: 'ooda', name: 'Observe, orient, decide, act (OODA)', origin: 'John Boyd', when: 'After results arrive, to decide the next move.', ask: ['What did we observe?', 'What does it change about our picture?', 'What do we do next, and what will we watch?'], lesson: 'Decisions are loops. The speed of learning from each loop matters more than getting the first one perfect.' },
  eisenhower: { id: 'eisenhower', name: 'Urgent and important', origin: 'Dwight Eisenhower', when: 'When several things compete for attention.', ask: ['Is this urgent, important, both or neither?', 'What happens if it waits a week?'], lesson: 'Urgent is not the same as important. Many automations only feel urgent.' },
  fivewhys: { id: 'fivewhys', name: 'Five whys', origin: 'Toyota Production System', when: 'When a run fails or surprises you.', ask: ['Why did it happen? And why did that happen?', 'Which cause can we actually fix?'], lesson: 'Keep asking why until you reach a cause you can change, not a person to blame.' },
  impacteffort: { id: 'impacteffort', name: 'Impact and effort', origin: 'Common prioritisation matrix', when: 'When choosing which use case to run or improve next.', ask: ['How much would this change for us?', 'How much work to set up and keep running?'], lesson: 'Start with high impact, low effort. Revisit the high-effort ones once the basics earn their keep.' },
  secondorder: { id: 'secondorder', name: 'Second-order effects', origin: 'Systems thinking', when: 'Before scaling a run that worked once.', ask: ['If this works, what changes next?', 'Who else is affected, such as customers, staff or partners?'], lesson: 'The first result is rarely the whole story. Ask what the result causes.' },
  cynefin: { id: 'cynefin', name: 'Simple, complicated, complex', origin: 'Dave Snowden (Cynefin)', when: 'To choose how much analysis a decision needs.', ask: ['Is there a known right answer, an answer experts can find, or only experiments?', 'Are we treating a complex problem like a simple one?'], lesson: 'Routine tasks need a checklist; unfamiliar ones need small safe experiments. The sandbox is exactly that safe experiment.' },
  swot: { id: 'swot', name: 'Strengths, weaknesses, opportunities, threats', origin: 'Standard strategy tool', when: 'When deciding whether to adopt a use case for the whole business.', ask: ['What do we do well that this builds on?', 'What could outside change do to it?'], lesson: 'Use it to compare options fairly, not to justify the one you already prefer.' },
  confidence: { id: 'confidence', name: 'State your confidence', origin: 'Forecasting practice (calibration)', when: 'When approving with incomplete information.', ask: ['How sure are we, as a percentage?', 'What would change our mind?'], lesson: 'Naming a number and a tripwire makes later review honest.' },
}

/** Picks the frameworks that fit a run. Rule-based and explainable. */
export function pickFrameworks(opts: { outward: boolean; reversible: boolean; mode: 'test' | 'live'; failed?: boolean; hasCost?: boolean }): Framework[] {
  const ids: string[] = []
  if (opts.mode === 'test') ids.push('cynefin', 'impacteffort', 'evidence')
  if (opts.outward) ids.push('doors', 'daci')
  if (opts.mode === 'live' && opts.outward) ids.push('premortem', 'confidence')
  if (opts.mode === 'live') ids.push('ooda', 'secondorder')
  if (opts.hasCost) ids.push('roi')
  if (opts.failed) ids.push('fivewhys')
  return Array.from(new Set(ids)).slice(0, 5).map((i) => FRAMEWORKS[i])
}
