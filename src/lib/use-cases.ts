// Use case templates. Each is a standard configuration a person can try as is, or customise.
// A step is internal (LOIS only), external (reaches another system through a connector) or a person's decision.
export type Step = { key: string; name: string; kind: 'internal' | 'external' | 'person'; does: string; why: string; produces: string; outward?: boolean; reversible?: boolean }
export type Field = { key: string; label: string; type: 'text' | 'select' | 'number' | 'list'; options?: string[]; help: string }
export type UseCase = {
  slug: string; title: string; category: string; summary: string; outward: boolean; reversible: boolean
  steps: Step[]; standard_config: Record<string, string | number>; config_fields: Field[]
  inputs: Field[]; expectation: string; measure: string
}

export const USE_CASES: UseCase[] = [
  {
    slug: 'social-media-management', title: 'Social media management', category: 'Marketing', outward: true, reversible: false,
    summary: 'Plan a week of posts, draft them in your voice, get a person to approve each one, publish through your automation, then learn what worked.',
    expectation: 'A week of approved posts published on schedule, with a short report on reach and responses.',
    measure: 'Posts published on time; reach and responses per post, as reported by the platform through your connector.',
    steps: [
      { key: 'brief', name: 'Gather brand voice and goals', kind: 'internal', does: 'Reads your accepted knowledge and the answers you gave.', why: 'Posts should sound like you and serve a goal.', produces: 'A one-paragraph brief.' },
      { key: 'plan', name: 'Plan the content calendar', kind: 'internal', does: 'Spreads the week across your platforms and themes.', why: 'A plan avoids last-minute posting.', produces: 'A calendar with days, platforms and themes.' },
      { key: 'draft', name: 'Draft the posts', kind: 'internal', does: 'Writes one draft per slot.', why: 'Drafting is the slow part; a person edits instead of starting blank.', produces: 'Draft posts, each labelled as a draft.' },
      { key: 'approve', name: 'A person approves each draft', kind: 'person', does: 'Waits for a named approver who is not the requester.', why: 'Public posts cannot be unpublished from people\'s feeds.', produces: 'Approved or rejected, with a note.' },
      { key: 'publish', name: 'Publish through your automation', kind: 'external', does: 'Sends the approved posts to your connector (Make, n8n or Zapier) to schedule.', why: 'The platform accounts live outside LOIS.', produces: 'Scheduled or posted confirmations.', outward: true, reversible: false },
      { key: 'collect', name: 'Collect results', kind: 'external', does: 'Your automation reports reach and responses back to LOIS.', why: 'Without results nothing can be learned.', produces: 'Numbers, labelled as reported.' },
      { key: 'learn', name: 'Summarise and learn', kind: 'internal', does: 'Writes a plain summary and proposes a learning to the Knowledge bank for review.', why: 'So the next week starts smarter.', produces: 'A summary and a pending Knowledge bank entry.' },
    ],
    standard_config: { tone: 'friendly and clear', platforms: 'LinkedIn, Instagram', posts_per_week: 5, themes: 'tips, behind the scenes, customer stories', approval: 'every post' },
    config_fields: [
      { key: 'tone', label: 'Tone of voice', type: 'text', help: 'For example: warm and professional.' },
      { key: 'platforms', label: 'Platforms', type: 'list', help: 'Comma separated.' },
      { key: 'posts_per_week', label: 'Posts per week', type: 'number', help: '1 to 21.' },
      { key: 'themes', label: 'Themes', type: 'list', help: 'Comma separated.' },
      { key: 'approval', label: 'Approval', type: 'select', options: ['every post', 'weekly batch'], help: 'Live runs always need approval. This sets how often.' },
    ],
    inputs: [
      { key: 'business', label: 'Business name', type: 'text', help: 'Use sample data when testing.' },
      { key: 'offer', label: 'What you sell or do', type: 'text', help: 'One sentence.' },
      { key: 'audience', label: 'Who it is for', type: 'text', help: 'One sentence.' },
      { key: 'goal', label: 'Goal for the week', type: 'text', help: 'For example: 20 new enquiries.' },
    ],
  },
  {
    slug: 'orders-and-invoicing', title: 'Distributor orders and invoicing', category: 'Sales and finance', outward: true, reversible: false,
    summary: 'Take an order, check it, prepare a quote, get approval, create the invoice and receipt, and follow up on payment.',
    expectation: 'Orders turned into approved quotes and invoices without retyping, with payment follow-ups drafted.',
    measure: 'Time from order to invoice; invoices paid on time; errors caught before sending.',
    steps: [
      { key: 'intake', name: 'Read the order', kind: 'internal', does: 'Pulls customer, items and quantities from the order text.', why: 'Retyping orders causes errors.', produces: 'A structured order.' },
      { key: 'check', name: 'Check stock, price and credit', kind: 'external', does: 'Asks your system (for example Odoo or a sheet) whether items are available and the customer is in good standing.', why: 'Stops promises you cannot keep.', produces: 'Availability and credit flags, labelled as reported.' },
      { key: 'quote', name: 'Prepare the quote', kind: 'internal', does: 'Applies your price list and terms.', why: 'Consistent pricing.', produces: 'A draft quote.' },
      { key: 'approve', name: 'A person approves the quote', kind: 'person', does: 'Waits for an approver who is not the requester.', why: 'A quote is a commitment.', produces: 'Approved or rejected, with a note.' },
      { key: 'invoice', name: 'Create the invoice and send it', kind: 'external', does: 'Creates the invoice in your accounting system and emails the customer.', why: 'Customers pay what they receive.', produces: 'Invoice number and delivery confirmation.', outward: true, reversible: false },
      { key: 'followup', name: 'Follow up on payment', kind: 'internal', does: 'Drafts polite reminders on the due date.', why: 'Late payment is usually forgetfulness.', produces: 'Reminder drafts for a person to send.' },
      { key: 'receipt', name: 'Record payment and issue the receipt', kind: 'external', does: 'Marks paid and sends a receipt.', why: 'A clean record.', produces: 'Receipt number.', outward: true, reversible: false },
    ],
    standard_config: { currency: 'KES', payment_terms: '14 days', reminder_after_days: 3, approval: 'every quote', tax: 'VAT 16%' },
    config_fields: [
      { key: 'currency', label: 'Currency', type: 'text', help: 'For example KES.' },
      { key: 'payment_terms', label: 'Payment terms', type: 'text', help: 'For example 14 days.' },
      { key: 'reminder_after_days', label: 'Reminder after (days)', type: 'number', help: 'Days past due.' },
      { key: 'tax', label: 'Tax', type: 'text', help: 'Name and rate.' },
      { key: 'approval', label: 'Approval', type: 'select', options: ['every quote', 'quotes above a limit'], help: 'Live runs always need approval.' },
    ],
    inputs: [
      { key: 'customer', label: 'Customer', type: 'text', help: 'Use a sample name when testing.' },
      { key: 'items', label: 'Items and quantities', type: 'text', help: 'For example: 20 cartons soap, 10 cartons oil.' },
      { key: 'amount', label: 'Rough total', type: 'number', help: 'In your currency.' },
    ],
  },
  {
    slug: 'lead-capture-and-follow-up', title: 'Lead capture and follow-up', category: 'Sales', outward: true, reversible: false,
    summary: 'Catch an enquiry, score it, route it to the right person, draft a follow-up, get approval, send, and track the outcome.',
    expectation: 'No enquiry left unanswered, and every follow-up reviewed before it goes out.',
    measure: 'Time to first reply; enquiries answered within a day; conversion to a conversation.',
    steps: [
      { key: 'capture', name: 'Capture the enquiry', kind: 'external', does: 'Your form or inbox sends the enquiry to LOIS.', why: 'One place for every lead.', produces: 'A lead record.' },
      { key: 'score', name: 'Score and route', kind: 'internal', does: 'Applies plain rules (budget, urgency, fit) and picks an owner.', why: 'The right person answers first.', produces: 'Score with reasons, and an owner.' },
      { key: 'draft', name: 'Draft the reply', kind: 'internal', does: 'Writes a reply using your accepted knowledge.', why: 'Fast, consistent answers.', produces: 'A draft reply.' },
      { key: 'approve', name: 'A person approves the reply', kind: 'person', does: 'Waits for an approver who is not the requester.', why: 'Customers see exactly what is sent.', produces: 'Approved or rejected, with a note.' },
      { key: 'send', name: 'Send and log', kind: 'external', does: 'Sends from your email or CRM and records it.', why: 'Keeps the history in one place.', produces: 'Sent confirmation.', outward: true, reversible: false },
      { key: 'track', name: 'Track and learn', kind: 'internal', does: 'Records the outcome and proposes a learning to the Knowledge bank.', why: 'Improves scoring over time.', produces: 'Outcome and a pending Knowledge bank entry.' },
    ],
    standard_config: { reply_within_hours: 4, tone: 'helpful and direct', score_rules: 'budget stated, urgent, in our service area', approval: 'every reply' },
    config_fields: [
      { key: 'reply_within_hours', label: 'Reply within (hours)', type: 'number', help: 'Your promise to customers.' },
      { key: 'tone', label: 'Tone', type: 'text', help: 'For example: warm.' },
      { key: 'score_rules', label: 'What makes a good lead', type: 'list', help: 'Comma separated.' },
      { key: 'approval', label: 'Approval', type: 'select', options: ['every reply', 'low-risk replies only'], help: 'Live runs always need approval.' },
    ],
    inputs: [
      { key: 'name', label: 'Lead name', type: 'text', help: 'Use a sample name when testing.' },
      { key: 'message', label: 'Their message', type: 'text', help: 'What they asked.' },
      { key: 'budget', label: 'Budget mentioned', type: 'text', help: 'If any.' },
    ],
  },
]

export const bySlug = (s: string) => USE_CASES.find((u) => u.slug === s)
