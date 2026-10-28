import Link from 'next/link'
import { POLICY_VERSION } from '@/lib/policy'

export const metadata = { title: 'Privacy notice', description: 'What LOIS collects, why, how long it is kept, and how to export, correct or delete your data.', alternates: { canonical: '/privacy' } }

export default function Privacy() {
  return (
    <main className="legal" id="main">
      <Link href="/" className="brand" style={{ color: 'var(--ink)' }}><i /> LOIS</Link>
      <h1 style={{ marginTop: '1rem' }}>Privacy notice</h1>
      <p className="muted">Version {POLICY_VERSION}. LOIS is operated by The Lucrebag, Nairobi, Kenya. This notice is written to follow the Kenya Data Protection Act, 2019 and the principles of the GDPR (lawfulness, purpose limitation, minimisation, accuracy, storage limitation, security). It is a plain-language working draft and should be reviewed by a qualified lawyer before you rely on it as a legal document.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account:</b> your email address, and a password (stored only as a salted hash by our authentication provider) or your Google sign-in identifier.</li>
        <li><b>Your three start-up answers:</b> what you want LOIS for, who will use it, and what kind of organisation you are. We do not ask for your name, phone number or any sensitive personal data.</li>
        <li><b>Your consent record:</b> what you agreed to, which version of this notice, when, and from which screen.</li>
        <li><b>Your workspace content:</b> documents, questions and decisions you add. These belong to your workspace.</li>
        <li><b>Basic usage statistics:</b> page views through Vercel Web Analytics, which does not use cookies or track you across sites.</li>
      </ul>

      <h2>Why, and on what basis</h2>
      <ul>
        <li>To create your account and keep it secure: necessary to provide the service.</li>
        <li>To point you to the right place first, from your three answers: your consent, which you can withdraw.</li>
        <li>To keep an audit trail of who changed what: our legitimate interest in security and accountability.</li>
        <li>Product updates by email: only if you ticked the optional box.</li>
      </ul>

      <h2>Who can see it</h2>
      <p>Only you and the people your workspace owner invites can see workspace content. Our team can see aggregate counts of start-up answers, not who gave them. We use Supabase (database and sign-in) and Vercel (hosting). Google receives only what is needed if you choose Google sign-in. We do not sell personal data.</p>

      <h2>How we protect it</h2>
      <p>Data is encrypted in transit. Every table has row-level security, so the database itself refuses access to other people&apos;s data. Privileges are least-by-default and changes are audited.</p>

      <h2>How long we keep it</h2>
      <p>Account data and answers are kept while your account exists. Consent records are kept as proof of consent. When you ask us to delete your account, we remove your account and answers; we may keep a minimal record of the deletion request itself.</p>

      <h2>Your rights</h2>
      <p>You can ask to see or download your data, correct it, restrict its use, withdraw consent, or have it deleted. Signed-in users can do this at <Link href="/app/privacy">Privacy</Link> inside LOIS, and download a copy instantly. We aim to respond within 30 days. You may also complain to the Office of the Data Protection Commissioner of Kenya (odpc.go.ke).</p>

      <h2 id="contact">Contact</h2>
      <p>Dustine Kibagendi, The Lucrebag, Nairobi: thelucrebag@gmail.com.</p>
    </main>
  )
}
