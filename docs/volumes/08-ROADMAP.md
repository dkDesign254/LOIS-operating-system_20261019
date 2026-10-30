# Volume 8: Roadmap (v1.0, 31 October 2026)

Order agreed with the owner on 30 October 2026: (1) Use case hub with the social media use case first and the others completed in sequence; (2) connectors by webhook now, Make API built and switched off until a paid plan exists; (3) run log that explains each action with decision frameworks; (4) editable run allowances; (5) native lite ERP and CRM with Odoo and Zoho connectors.

## Next builds
1. Run the three templates end to end against a real Make webhook (needs the owner's scenario; the owner is building these in a separate session and will share them for review).
2. Text-to-scenario: describe a workflow in chat; LOIS drafts a Make or n8n blueprint for review. Uses the Make API when available. Never switched on by itself.
3. Native ERP and CRM core: contacts and companies, deals and pipeline, quotes, invoices, receipts and promissory notes as documents with numbering and tax lines, stock list, simple ledger. Email through the user's own Gmail connection with approval before send.
4. Odoo connector first for clients already on Odoo (external API: contacts, invoices, products). Zoho second. Odoo's own source is a very large Python codebase under a licence that does not allow copying it; LOIS builds its own native modules and connects to Odoo instead.
5. Per-use-case standing approvals, kill switch, and autonomous mode: an explicit owner decision per use case, with logging.
6. Trial reminder emails, AI-written drafts in the briefing, version history UI polish, social and work account linking.
7. Subscription handling: plan table, payment provider, automatic allowance changes.

## Not decided
Payment provider; email sender for system emails; whether partners get their own workspaces.
