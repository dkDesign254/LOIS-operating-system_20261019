// Single source of truth for the assessment questions and the policy version people consent to.
// Bump POLICY_VERSION whenever /privacy changes materially; people are then asked to consent again.
export const POLICY_VERSION = '2026-10'

export const QUESTIONS = [
  {
    key: 'intent',
    title: 'What do you most want LOIS to help with?',
    options: [
      { v: 'help_knowledge', label: 'Answer questions from our own documents' },
      { v: 'decisions', label: 'Prepare decisions for a person to approve' },
      { v: 'automation', label: 'Connect LOIS to our tools and automations' },
      { v: 'explore', label: 'Just exploring for now' },
    ],
  },
  {
    key: 'audience',
    title: 'Who will use it?',
    options: [
      { v: 'myself', label: 'Just me' },
      { v: 'my_team', label: 'My team' },
      { v: 'my_clients', label: 'My clients or customers too' },
    ],
  },
  {
    key: 'org_type',
    title: 'Which best describes you?',
    options: [
      { v: 'startup', label: 'Start-up or small business' },
      { v: 'established', label: 'Established company' },
      { v: 'nonprofit', label: 'Non-profit or public body' },
      { v: 'personal_brand', label: 'Independent or personal brand' },
      { v: 'other', label: 'Something else' },
    ],
  },
] as const

export type Answers = { intent: string; audience: string; org_type: string }

export const VALID: Record<string, string[]> = Object.fromEntries(QUESTIONS.map((q) => [q.key, q.options.map((o) => o.v)]))

export function validAnswers(a: Partial<Answers>): a is Answers {
  return Boolean(a.intent && a.audience && a.org_type && VALID.intent.includes(a.intent) && VALID.audience.includes(a.audience) && VALID.org_type.includes(a.org_type))
}

/** Where to send someone first, based only on what they said they want. */
export function recommend(a: Answers): { path: string; why: string } {
  if (a.intent === 'decisions') return { path: '/app/sandbox', why: 'Try a decision as a dry run first. Nothing is saved or executed.' }
  if (a.intent === 'automation') return { path: '/app/integrations', why: 'You want to connect LOIS to your tools.' }
  if (a.intent === 'help_knowledge') return { path: '/app/knowledge', why: 'Start by adding the documents you want answers from.' }
  return { path: '/app/learn', why: 'A short tour is the quickest way to see what LOIS does.' }
}

/** Turn raw Supabase auth errors into something a person can act on. */
export function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('error sending') && m.includes('email')) return 'We could not send the email just now. Please try again in a minute, or sign in with Google. If this keeps happening, the workspace owner needs to check the email settings.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('invalid login')) return 'That email and password do not match. Check them, or use "Email me a code" instead.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'That email already has an account. Sign in instead, or reset your password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. We sent you a link when you registered.'
  if (m.includes('password') && (m.includes('weak') || m.includes('short') || m.includes('at least'))) return 'Choose a longer password (at least 10 characters).'
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Google sign-in is not switched on yet. Use an email code for now.'
  if (m.includes('exchange external code')) return 'Google accepted you, but LOIS could not complete the sign-in. The Google client ID or secret in Supabase is probably wrong. Use an email code for now.'
  return 'Something went wrong. Please try again.'
}
