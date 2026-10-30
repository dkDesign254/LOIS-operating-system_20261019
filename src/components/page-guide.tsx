'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type G = { what: string; doit: string; dont: string }

// Pages that already carry their own guide (Start here, Decisions, Business arms, Data & backups, Learn) are not repeated here.
const GUIDES: Record<string, G> = {
  '/app': { what: 'Ask LOIS: a help assistant that answers only from your approved knowledge and shows its sources.', doit: 'Pick Untangle, Decide, Compare or Learn, or just type a question. Press the person button if you want a human.', dont: 'Do not paste passwords or ID numbers. If LOIS says it has no match, that is honest, not a fault.' },
  '/app/sandbox': { what: 'The safe practice area. A dry run shows what LOIS would find and recommend. Nothing is saved or executed.', doit: 'Type a scenario, read the evidence, then try the AI Studio or one of the seven small tools.', dont: 'Do not treat results as decisions. A person decides.' },
  '/app/sandbox/studio': { what: 'AI Studio: one place to use several AI models. LOIS picks the best connected model for each job and hands work between them with shared context.', doit: 'Choose Auto, Compare or Chain, type your request, and read which model answered and why.', dont: 'Use sample or anonymised text. Models are third parties and we cannot see inside them.' },
  '/app/knowledge': { what: 'Your knowledge base: the documents LOIS may answer from.', doit: 'Paste or upload a document, give it an honest evidence label, then ask about it in Ask LOIS.', dont: 'Do not add anything you would not want a colleague to read. Labelling something verified when it is not weakens every answer.' },
  '/app/intake': { what: 'Intake: drop in files and LOIS names them safely, skips duplicates, reads the text (including scans and photos) and drafts a summary.', doit: 'Choose up to four files, say how much you trust them, then read the result. Check anything marked needs a careful look.', dont: 'Do not upload files with passwords or ID numbers. AI reading of scans can misread, so a person must review the draft.' },
  '/app/readiness': { what: 'Agent readiness: a check of how easily people, search engines and AI agents can find, read and trust a website.', doit: 'Enter a public address, read the four scores, then work through Fix these first from the top.', dont: 'Do not treat a score as a verdict. It reads one page at one moment and cannot see behind a login.' },
  '/app/bank': { what: 'The knowledge bank: entries a reviewer has accepted. Only accepted entries teach LOIS.', doit: 'Propose an entry, or if you are a reviewer, accept or reject pending ones with a reason.', dont: 'Do not accept an entry you have not checked.' },
  '/app/help': { what: 'Questions LOIS could not answer, waiting for a person.', doit: 'Reviewers: answer, and optionally send the answer to the bank so the next person gets it instantly.', dont: 'Do not close a request without an answer.' },
  '/app/projects': { what: 'Projects group knowledge and conversations so answers stay on topic.', doit: 'Create a project, then choose it when you add documents.', dont: 'Do not mix clients in one project.' },
  '/app/rewards': { what: 'Points for useful contributions: documents added, answers rated, bank entries accepted.', doit: 'Contribute, then check your standing. The leaderboard is opt-in under Profile.', dont: 'Do not game points. Reviewers can reverse them.' },
  '/app/integrations': { what: 'Connect other tools with API keys and signed webhooks. Works with n8n and Make.', doit: 'Create a key, copy it once, and test with the example call.', dont: 'Never share a key in chat or email. Revoke it if it leaks.' },
  '/app/team': { what: 'Invite people and control what each can do, service by service.', doit: 'Invite by email, choose a role, then fine-tune privileges where needed.', dont: 'Do not give admin to someone who only needs to ask questions.' },
  '/app/profile': { what: 'How LOIS talks to you: tone, answer length and your leaderboard choice.', doit: 'Set your tone and length, then save.', dont: 'Do not put sensitive details in free-text fields.' },
  '/app/insights': { what: 'Counts of what people do in this workspace: questions, Studio use, review decisions, models and the state of the Knowledge bank.', doit: 'Read "What needs attention" first, then switch between 7, 30 and 90 days.', dont: 'Do not look for names or message text. Only counts are shown, on purpose.' },
  '/app/research': { what: 'Searches the web for you and lists the pages it used.', doit: 'Ask one clear question, open the sources, then propose useful findings to the Knowledge bank.', dont: 'Do not treat web findings as verified. Do not paste confidential details into the question.' },
  '/app/briefs': { what: 'Check whether a decision is ready: what is clear, what is missing, who should approve.', doit: 'Type the decision, the options and what you know. Save the brief.', dont: 'Do not paste sensitive documents. Name them instead.' },
  '/app/briefing': { what: 'A short morning summary of what needs you, with where each line came from.', doit: 'Pick your time and days, then press Listen or read it.', dont: 'Do not treat it as advice. It only counts what is in your workspace.' },
  '/app/access': { what: 'Ask the team that runs LOIS for access to their internal areas.', doit: 'Say what you need and why. A staff member replies.', dont: 'Do not expect access to open on its own. Every request is checked by a person.' },
  '/app/privacy': { what: 'What we hold about you and how to use your rights.', doit: 'Download your data, withdraw optional consent, or send a request.', dont: 'Nothing to avoid. We respond to requests within 30 days.' },
}

export function PageGuide() {
  const path = usePathname()
  const g = GUIDES[path]
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      const seen = localStorage.getItem(`lois_guide_${path}`)
      setOpen(!seen)
      if (!seen) localStorage.setItem(`lois_guide_${path}`, '1')
    } catch {
      setOpen(false)
    }
  }, [path])
  if (!g) return null
  return (
    <details className="guide" open={open} key={path} style={{ marginBottom: '1rem' }}>
      <summary>What am I looking at?</summary>
      <div className="gb">
        <div><b>What this is</b>{g.what}</div>
        <div><b>What to do here</b>{g.doit}</div>
        <div><b>What to avoid</b>{g.dont}</div>
      </div>
    </details>
  )
}
