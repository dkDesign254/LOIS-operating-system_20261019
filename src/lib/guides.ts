export type Guide = { slug: string; title: string; summary: string; minutes: number; topic: 'Visibility' | 'Working with AI' | 'Knowledge' | 'Decisions'; steps: { h: string; p: string }[]; example?: { label: string; code: string }; inLois?: { label: string; href: string } }

export const GUIDES: Guide[] = [
  {
    slug: 'make-your-site-readable-to-ai', title: 'Make your website readable to AI agents', topic: 'Visibility', minutes: 6,
    summary: 'AI assistants and search engines read your page the way a visitor with no eyes and no patience would. Give them clear text, clear structure and clear permission.',
    steps: [
      { h: 'Put the real content in the first page load', p: 'Many agents do not run scripts. If your words appear only after JavaScript runs, they may see an empty page. Render your main text on the server.' },
      { h: 'Say what the page is, in the title and description', p: 'A title of 10 to 70 characters and a description of 50 to 170 characters, written in plain language, is the first thing every reader sees.' },
      { h: 'Declare language, canonical address and viewport', p: 'Set lang on the html tag, add a canonical link so duplicates do not compete, and add the viewport tag so phones scale the page.' },
      { h: 'Publish a sitemap.xml and a robots.txt', p: 'The sitemap lists the pages you want found. The robots.txt states who may read what. Both are plain files at the root of your site.' },
      { h: 'Describe images and label form fields', p: 'Short alt text on meaningful images, and a visible label on every form field, help people with screen readers and agents alike.' },
      { h: 'Show how to reach you and how you handle data', p: 'An email, phone or contact page, and a privacy notice linked from the footer, are basic trust signals for both people and agents.' },
    ],
    inLois: { label: 'Scan your site', href: '/app/readiness' },
  },
  {
    slug: 'write-an-llms-txt', title: 'Write an llms.txt file', topic: 'Visibility', minutes: 4,
    summary: 'llms.txt is a short, plain Markdown file at the root of your site that tells AI systems what you are and where your best pages are. It is a proposed convention, not a guarantee that any system reads it.',
    steps: [
      { h: 'Start with a title and one-sentence summary', p: 'Use one H1 with your name, then a short quote line saying what you do and for whom.' },
      { h: 'List your most useful pages', p: 'Under H2 headings such as Services or Guides, list links with a few words about each. Link to pages written for people, not login pages.' },
      { h: 'Keep it short and true', p: 'Under a page of text. Do not make claims you would not put on your homepage.' },
      { h: 'Publish it at /llms.txt and check it loads', p: 'Visit yoursite.com/llms.txt in a browser. It should show plain text, not an HTML page.' },
    ],
    example: { label: 'Example', code: '# Acme Studio\n> Brand strategy and automation for startups in Nairobi.\n\n## Services\n- [Brand strategy](https://acme.example/brand): positioning and identity\n- [Automation](https://acme.example/automation): workflows that save hours\n\n## Guides\n- [How we work](https://acme.example/process): our four-step process' },
    inLois: { label: 'Scan your site', href: '/app/readiness' },
  },
  {
    slug: 'robots-txt-for-ai-crawlers', title: 'Decide which crawlers may read your site', topic: 'Visibility', minutes: 5,
    summary: 'robots.txt is where you choose whether search engines and AI crawlers may read your pages. The choice is yours. The mistake is making it by accident.',
    steps: [
      { h: 'Know the common AI crawler names', p: 'GPTBot (OpenAI), ClaudeBot (Anthropic), PerplexityBot (Perplexity), Google-Extended (Google AI training controls) and CCBot (Common Crawl). Names change, so check each company documentation.' },
      { h: 'Decide on purpose', p: 'Allowing them makes you easier to find in AI answers. Blocking them keeps your content out of those systems but also out of their answers. Different pages can have different rules.' },
      { h: 'Never leave a blanket block by accident', p: 'User-agent: * with Disallow: / hides the whole site from everyone. Staging settings often leak into live sites this way.' },
      { h: 'Do not use robots.txt for secrets', p: 'It is public and only a request. Protect private pages with a login.' },
      { h: 'Remove stray noindex tags', p: 'A noindex meta tag on a page you want found tells search engines to drop it.' },
    ],
    example: { label: 'Allow everyone, block one crawler', code: 'User-agent: *\nAllow: /\n\nUser-agent: CCBot\nDisallow: /\n\nSitemap: https://yoursite.com/sitemap.xml' },
    inLois: { label: 'Scan your site', href: '/app/readiness' },
  },
  {
    slug: 'structured-data-in-ten-minutes', title: 'Structured data in ten minutes', topic: 'Visibility', minutes: 8,
    summary: 'JSON-LD is a small block of data in your page that states plainly who you are and what the page is, so machines do not have to guess.',
    steps: [
      { h: 'Use one h1 and clear h2 sections', p: 'Headings are structure too. One h1 names the page and h2 headings name its sections.' },
      { h: 'Describe your organisation once', p: 'Add an Organization block with name, URL, logo and a way to contact you, usually on the home page.' },
      { h: 'Describe articles and services where they live', p: 'Use Article for posts and Service or Product for offers, with a headline, description and date.' },
      { h: 'Add a share card', p: 'Open Graph title and image tags control how your page looks when shared.' },
      { h: 'Test it', p: 'Paste your page into a structured-data testing tool and fix errors. Describe only what is visible on the page.' },
    ],
    example: { label: 'Organization', code: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Acme Studio",\n  "url": "https://acme.example",\n  "email": "hello@acme.example"\n}\n</script>' },
    inLois: { label: 'Scan your site', href: '/app/readiness' },
  },
  {
    slug: 'ask-better-questions', title: 'Ask AI better questions', topic: 'Working with AI', minutes: 5,
    summary: 'Good answers start with a good brief. Four parts are enough: context, task, limits and the shape you want back.',
    steps: [
      { h: 'Give context', p: 'Who you are, who it is for, and what already exists. One paragraph beats three questions later.' },
      { h: 'State one task', p: 'Draft, compare, summarise, check or plan. If you need two, ask for them in order.' },
      { h: 'Set limits', p: 'Length, tone, what to leave out, and what must be true. Say what is a guess and what is a fact.' },
      { h: 'Ask for the shape', p: 'A table, three options, a short email, steps with owners. Shape reduces rework.' },
      { h: 'Ask what would change the answer', p: 'A good assistant names its assumptions and what evidence would flip the recommendation.' },
    ],
    inLois: { label: 'Open the AI Studio', href: '/app/sandbox/studio' },
  },
  {
    slug: 'choose-the-right-model', title: 'Auto, Compare or Chain: which to use', topic: 'Working with AI', minutes: 4,
    summary: 'Different models are better at different jobs. The AI Studio lets you use several without juggling tools.',
    steps: [
      { h: 'Auto for everyday work', p: 'LOIS reads the task, picks the connected model that suits it best, and tries the next one if the first fails. You see which answered and why.' },
      { h: 'Compare when the stakes are higher', p: 'Ask up to three models at once and read the answers side by side. Disagreement is a signal to check the facts.' },
      { h: 'Chain for longer pieces', p: 'One model plans, one drafts, one checks. Each step sees the earlier ones, so nothing is lost between them.' },
      { h: 'Use anonymised text', p: 'Models are run by third parties. Remove names, numbers and anything private before you paste.' },
      { h: 'A person decides', p: 'The Studio prepares and recommends. It never sends, pays or publishes for you.' },
    ],
    inLois: { label: 'Open the AI Studio', href: '/app/sandbox/studio' },
  },
  {
    slug: 'documents-into-knowledge', title: 'Turn documents into trusted knowledge', topic: 'Knowledge', minutes: 6,
    summary: 'LOIS answers from what you give it. Clean input and honest labels make every later answer better.',
    steps: [
      { h: 'Add one clear document per topic', p: 'A policy, a price list or a process. Short and current beats long and stale.' },
      { h: 'Label how much you trust it', p: 'Verified means a person checked it. Reported means it came from a source nobody has checked. Example means illustrative. Do not label something verified until it is.' },
      { h: 'Let intake draft the summary', p: 'Upload files in Intake. LOIS reads them, including scans and photos, drafts a title and summary, and flags low confidence.' },
      { h: 'Review before it teaches LOIS', p: 'Drafts wait in the knowledge bank. A reviewer accepts or rejects with a reason. Only accepted entries become authoritative.' },
      { h: 'Retire what is out of date', p: 'Expire or replace old entries so old answers do not keep returning.' },
    ],
    inLois: { label: 'Open Intake', href: '/app/intake' },
  },
  {
    slug: 'human-approval-for-ai', title: 'When a person must approve', topic: 'Decisions', minutes: 5,
    summary: 'AI is fast at preparing. People are accountable for deciding. Draw the line before you need it.',
    steps: [
      { h: 'List what cannot be undone', p: 'Sending to a client, paying, publishing, deleting, signing. These always need a named person.' },
      { h: 'List what involves other people money or data', p: 'Anything touching a customer record, a payment or personal data needs approval and a recorded reason.' },
      { h: 'Let AI prepare, not act', p: 'A draft, a comparison or a recommendation with its confidence and what would change it.' },
      { h: 'Record who decided and why', p: 'A one-line reason now saves an argument later. LOIS keeps this with the decision.' },
      { h: 'Delegate on purpose', p: 'You can hand a question to a more qualified person. Say which question, to whom, and what they may see.' },
    ],
    inLois: { label: 'Try a dry run in the sandbox', href: '/app/sandbox' },
  },
]

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug)
