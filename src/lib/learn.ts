/** Content ported from the LOIS Control Centre v0.5 artefact: induction by role, glossary, and the seven Sandbox tools. */
export type RoleKey = 'manager' | 'employee' | 'client' | 'owner' | 'builder'

export const LEARN: Record<RoleKey, { title: string; offer: string; steps: string[]; good: string[]; bad: string[] }> = {
  manager: {
    title: 'New manager',
    offer: 'A single place to see what needs your decision, what is failing, and what changed. LOIS prepares. You decide.',
    steps: ['Open Start here and read the top actions.', 'Go to Decisions, open a Decision Brief, write your reason, then decide. LOIS will not let a high-risk request pass without evidence.', 'Ask LOIS: "What changed this week and what should I decide first?"'],
    good: ['Read the evidence before you approve.', 'Write a reason with every decision so you can stand by it later.', 'Treat a dash as "not known yet".'],
    bad: ['Do not treat Example items as real work.', 'Do not approve because an AI draft looks polished.'],
  },
  employee: {
    title: 'Employee',
    offer: 'Simple AI helpers for daily tasks, and a shared memory so nothing you learn is lost.',
    steps: ['Try two tools in the Sandbox with your own sample text.', 'Rate each result. LOIS learns from your ratings.', 'Add one fact or lesson to Memory today.'],
    good: ['Use sample or anonymised text in the Sandbox.', 'Flag anything odd as a risk entry.', 'Send drafts to a human before they go out.'],
    bad: ['Do not paste client secrets, passwords or ID numbers.', 'Do not send an AI draft without reading it.'],
  },
  client: {
    title: 'Test client',
    offer: 'A safe space to see what AI and automation could do for your business, using your own examples.',
    steps: ['Open Sandbox and pick the tool closest to your work.', 'Replace the sample text with a real situation of yours, without private details.', 'Read "What it would do in Make" and "What to measure". Tell us which you want.'],
    good: ['Start with one small, repeated task.', 'Say what result you would count as success.', 'Ask for the human-approval step to stay in.'],
    bad: ['Do not expect a live connection to your tools yet. Demos run in this app only.', 'Do not enter customer personal data.'],
  },
  owner: {
    title: 'Owner / admin',
    offer: 'The governance view: automation health, decisions, data continuity and an audit log.',
    steps: ['Resolve the blockers listed on Start here.', 'Confirm who owns each governance scenario.', 'Run the backup drill before any real data moves.'],
    good: ['Keep review and approval separate.', 'Quarantine, do not delete.', 'Record scope decisions as Decisions in Memory.'],
    bad: ['Do not switch on a scenario that has not passed its regression run.', 'Do not move operational data before a recovery point exists.'],
  },
  builder: {
    title: 'Automation builder',
    offer: 'Rules for adding workflows so the OS stays safe and traceable.',
    steps: ['Name it "LOIS-AREA-Purpose-vX.Y".', 'Register it in Automations with an owner and a rollback.', 'Pass its regression harness before it is switched on.'],
    good: ['Write results to a data store, not only to a run log.', 'Add an error handler and a human gate for any outward action.', 'Document inputs and outputs.'],
    bad: ['Do not leave temporary scenarios running.', 'Do not bypass the execution boundary. Phase 1 always returns execution: NO.'],
  },
}

export const GLOSSARY: [string, string][] = [
  ['Clarity', 'Knowing what is known, what is not, and why you chose. The purpose of LOIS.'],
  ['Decision readiness', 'Five separate measures for a decision: evidence coverage, freshness, source reliability, unresolved issues, and authority. Each opens its definition. There is no single score.'],
  ['Decision Brief', 'One page for a leader: what we know, what we do not, options, a recommendation, confidence and a sentence to stand behind.'],
  ['Verified', 'Read directly from the source and checked by a person.'],
  ['Reported', 'Told to us by another person or session. Not checked yet.'],
  ['Example', 'Made-up sample data so you can see how a screen works.'],
  ['Review vs approval', 'Review means a person looked. Approval means a person authorised an action. They are separate.'],
  ['execution: NO', 'Phase 1 only recommends. It never acts.'],
  ['Scenario', 'One automated workflow in Make.'],
  ['Audit log', 'A permanent list of who did what and when. Entries cannot be edited or deleted.'],
  ['Knowledge base', 'Documents you add. Searchable at once, labelled by how much you trust them.'],
  ['Knowledge bank', 'Entries a reviewer has accepted. Versioned and unchangeable; a correction is a new version.'],
]

export type Demo = { id: string; title: string; who: string; problem: string; input: string; prompt: string; flow: [string, string][]; measure: string }

export const DEMOS: Demo[] = [
  {
    id: 'decide', title: 'Make a clear decision fast', who: 'Anyone who must decide with limited information',
    problem: 'Decisions are made on gut feel and are hard to defend later.',
    input: 'Two offers for the Greenleaf Coffee packaging redesign. Option A: agency, 3 weeks, KES 240,000. Option B: freelancer, 5 weeks, KES 120,000. Launch is in 6 weeks. The client has not approved a brief yet. I must decide today.',
    prompt: 'You help a leader decide with limited time and information, in UK English. Write: THE DECISION (one line). WHAT WE KNOW (only from the text). WHAT WE DO NOT KNOW (the gaps that matter most). OPTIONS (each with its main trade-off). RECOMMENDATION with confidence (high, medium or low). WHAT WOULD CHANGE MY MIND. WHAT THE TEAM WILL NEED TO EXECUTE. IF CHALLENGED LATER: one sentence the leader can stand behind. Do not invent facts. Under 250 words.',
    flow: [['Trigger', 'A short form: "Decision needed" with the situation and the deadline.'], ['AI', 'Writes the brief in the same structure every time.'], ['Human gate', 'The leader reads it, writes a reason, and decides.'], ['Log', 'Brief, reason and outcome saved to LOIS Memory and the audit log.']],
    measure: 'Time to decision. Share of decisions with a written reason. Decisions later reversed.',
  },
  {
    id: 'lead', title: 'Reply to a new enquiry', who: 'Consulting, Branding, any service business',
    problem: 'Enquiries wait hours for a reply and good leads go cold.',
    input: 'Hi, I run a small bakery in Kilimani and we are launching a second outlet in November. Our logo is old and our Instagram is a mess. Can you help? Budget is not huge but we are serious. Thanks, Wanjiru',
    prompt: 'You are the front desk of a Nairobi brand strategy practice. Read the enquiry and answer in UK English with three headed parts. LEAD TEMPERATURE: Hot, Warm or Cold with one line of reasoning. MISSING INFORMATION: up to three short questions. DRAFT REPLY: it must begin exactly with "Hello [Name], I hope you are well." using the sender\'s first name, then three to five short sentences, offering a 20-minute discovery call, with no prices. Never invent facts.',
    flow: [['Trigger', 'Gmail: new email with label Enquiry, or a website form into a Make webhook.'], ['AI', 'Make calls an AI module with the same instruction.'], ['Human gate', 'The draft is saved to Gmail Drafts. A person reads and sends it.'], ['Log', 'Airtable row: sender, temperature, time to first reply. LOIS audit entry.']],
    measure: 'Time to first reply. Share of enquiries answered within one hour.',
  },
  {
    id: 'remind', title: 'Chase an unpaid invoice politely', who: 'Every arm',
    problem: 'Following up on late payment feels awkward, so it is delayed.',
    input: 'Client: Greenleaf Coffee Ltd. Invoice INV-0412 for KES 85,000, due 30 September. It is now 15 October. Previous contact: one friendly reminder on 5 October, no reply. Tone: warm but firm.',
    prompt: 'You write payment reminders for a Nairobi creative practice, in UK English. From the details, produce a three-step sequence: Reminder 1 (friendly), Reminder 2 (clear, mentions the date and amount), Reminder 3 (firm, offers a call, mentions next steps without threats). Each begins "Hello [Team Name], I hope you are well." Keep each under 70 words. Use only the facts given.',
    flow: [['Trigger', 'Make runs daily and finds invoices past due in Airtable.'], ['AI', 'Chooses the reminder step from days overdue and writes it.'], ['Human gate', 'Reminder 3 always goes to a person for approval.'], ['Log', 'Status and date written back. Audit entry kept.']],
    measure: 'Days to payment. Share of invoices paid within 7 days of the first reminder.',
  },
  {
    id: 'notes', title: 'Turn meeting notes into actions', who: 'Managers and employees',
    problem: 'Decisions and tasks vanish after the meeting.',
    input: 'Call with Storymoja team. Austin to confirm the campaign launch date by Friday. We agreed to pause paid ads until the new creative is approved. Budget question for next week: can we move KES 20,000 from print to social? Someone must check the Wild Legacy backer emails.',
    prompt: 'Turn these meeting notes into: DECISIONS (what was agreed), ACTIONS (owner, task, due date or "no date given"), OPEN QUESTIONS, and RISKS. If an owner is not named, write "Unassigned". Do not invent owners or dates. UK English, short lines.',
    flow: [['Trigger', 'Notes pasted into a form, or a Google Doc saved in a Meetings folder.'], ['AI', 'Extracts decisions, actions, questions.'], ['Human gate', 'Organiser confirms owners.'], ['Log', 'Actions into ClickUp, decisions into LOIS Memory.']],
    measure: 'Actions captured per meeting. Share of actions with an owner and a date.',
  },
  {
    id: 'content', title: 'Repurpose one idea into four posts', who: 'Fashion, Branding, Content Studio',
    problem: 'Good ideas are used once.',
    input: 'We just finished a visual identity for a Nairobi coffee roaster. The key idea: every bag shows the altitude of the farm as the hero number. Result: the owner says customers now ask which altitude they like.',
    prompt: 'You are a content editor for a Nairobi brand studio. From the idea, write: a LinkedIn post (under 120 words, one lesson), an Instagram caption (under 40 words plus 3 hashtags), a WhatsApp broadcast (under 30 words), and an X-style one-liner. Calm, confident tone. Do not claim numbers that were not given.',
    flow: [['Trigger', 'New row in the Content Ideas table.'], ['AI', 'Writes the four formats.'], ['Human gate', 'Editor approves each post.'], ['Log', 'Approved posts scheduled. Published links saved.']],
    measure: 'Posts produced per idea. Time from idea to scheduled.',
  },
  {
    id: 'faq', title: 'Answer customers only from your facts', who: 'Fashion shops, service firms',
    problem: 'The same questions arrive all day, and wrong answers cost trust.',
    input: 'KNOWLEDGE:\nDelivery in Nairobi: 1 to 2 working days, KES 300.\nReturns: within 7 days if unworn and tagged.\nPayment: M-Pesa or card.\nOpening hours: Mon to Sat, 9am to 6pm.\n\nQUESTION:\nCan I return a jacket I wore once, and do you deliver to Mombasa?',
    prompt: 'You answer customer questions for a Nairobi shop. Use ONLY the KNOWLEDGE given. If the answer is not in it, say "I do not know. I have passed this to the team." and list exactly what the team must confirm. Be brief and kind. Start with "Hello, I hope you are well." UK English.',
    flow: [['Trigger', 'Message arrives from WhatsApp or website chat.'], ['AI', 'Answers from the stored knowledge only.'], ['Human gate', 'Anything marked unknown goes to a person.'], ['Log', 'Unanswered questions added to the knowledge list weekly.']],
    measure: 'Share answered without a person. Number of new facts added to the knowledge list.',
  },
  {
    id: 'weekly', title: 'Write the Monday owner briefing', who: 'Owners and managers',
    problem: 'Numbers exist but nobody has time to explain them.',
    input: 'Revenue last week KES 412,000 (target 450,000). Open quotes: 6 worth KES 1.1m. Overdue invoices: 3 worth KES 190,000. Ads spend KES 38,000, 14 leads. Team: one deadline slipped (Greenleaf logo).',
    prompt: 'You are a chief of staff. From the numbers, write a Monday briefing in UK English: HEADLINE (one sentence), WHAT WENT WELL, WHAT NEEDS ATTENTION, THREE DECISIONS FOR THIS WEEK, each with your recommendation and what would change your mind. Use only the numbers given. Mark any inference as an inference.',
    flow: [['Trigger', 'Every Monday 07:00 in Make.'], ['AI', 'Reads the week from Airtable and writes the briefing.'], ['Human gate', 'None needed to read. Actions inside it still need approval.'], ['Log', 'Briefing saved in Drive. Key decisions go to LOIS Memory.']],
    measure: 'Minutes saved per week. Decisions made from the briefing.',
  },
]
