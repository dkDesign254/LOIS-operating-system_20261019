# Automation recipes (n8n and Make)

Both tools work through the same two pieces: the **HTTP API** (`/api/v1`) to push things in, and **signed webhooks** to react when something happens.

Create a key under **Integrations → API keys**. Give it write scope only if the flow needs to submit entries.

## 1. Drive / Notion / email → knowledge bank (needs review)

Trigger (new file, page or labelled email) → HTTP Request:

```
POST https://<your-app>/api/v1/knowledge
Authorization: Bearer <key with write scope>
{ "title": "{{title}}", "content": "{{text}}", "domain": "support", "source": "n8n:drive", "label": "reported" }
```

The entry lands as `pending_review`. Nothing becomes trusted until a reviewer accepts it in **Knowledge bank**.

## 2. Slack / WhatsApp question → cited answer

Trigger (new message in a help channel) → HTTP Request `POST /api/v1/search` with `{"query":"{{message}}","limit":3}` → reply with the top result's `title`, `snippet` and `evidence_label`. If `count` is 0, post to the team channel instead of guessing.

## 3. New accepted entry → announce it

Add a webhook (Integrations → Webhooks) pointing at an n8n Webhook node or Make custom webhook. On `knowledge.approved`, post the title to Slack or update a changelog.

Verify the signature before trusting a delivery:

```js
// Node (n8n Code node)
const crypto = require('crypto');
const [t, v1] = headers['lois-signature'].split(',').map(p => p.split('=')[1]);
const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(`${t}.${rawBody}`).digest('hex');
if (expected !== v1 || Math.abs(Date.now()/1000 - Number(t)) > 300) throw new Error('bad signature');
```

## 4. Weekly review digest

Cron (Monday 08:00) → Supabase node/HTTP query for entries `pending_review` → email or Slack the reviewers a count and links. (Use a read-only Supabase service connection owned by you, not the public API key.)

## 5. Gap report

Run `select * from lois_gap_candidates` in Neon weekly (see `docs/NEON.md`) and send the list to reviewers: questions people keep asking that the bank can't answer yet.
