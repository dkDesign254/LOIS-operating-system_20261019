# Make scenario specifications (build brief) v0.1, 31 Oct 2026

Status: specifications only. The Make connector on Dustine Kibagendi's claude.ai account shows "needs reconnect", so no scenario has been created in Make yet. When it is reconnected, each scenario below is created in folder 40_SANDBOX (team 2821894), named `LOIS-SBX-<Purpose>-v0.1`, labelled `ARM-LUCREBAG` and `STATE-UNCERTIFIED`, and left switched OFF (register rule 6: anything that sends, pays or publishes needs a human approval step).

## Contract with LOIS (all scenarios)
- Trigger: Custom webhook receiving `{run_id, use_case, input, config, approval_note, callback_url, callback_token}`.
- Finish: HTTP module POSTs `{run_id, token: callback_token, result}` to `callback_url` (`/api/v1/run-callback`). Always run an error handler that posts `{status:"failed", error}` too.
- Test runs (`approval_note` empty) must never reach an outward module: use a Router filter `approval_note` exists AND length >= 5 in front of every outward step.
- Do not store keys in the scenario text; use Make connections.

## SBX-SocialPlan-v0.1 (use case: social-media-management)
1. Webhook. 2. Router: filter on approval_note. 3. Iterator over `input.posts`. 4. Buffer/Metricool or the platform module "create scheduled post for review" (never "publish now"). 5. Aggregator. 6. HTTP callback with scheduled IDs, labelled reported.

## SBX-OrderToInvoice-v0.1 (use case: orders-and-invoicing)
1. Webhook. 2. HTTP to LOIS ERP (Supabase RPC `erp_issue_doc`) only after approval_note. 3. Email module drafts (Gmail "create draft", not send). 4. Callback with invoice number.

## SBX-LeadReply-v0.1 (use case: lead-capture-and-follow-up)
1. Webhook or form trigger. 2. Gmail create draft with the approved reply. 3. Callback with draft ID.

## Review checklist before any is switched on
Trigger payload matches the contract; callback present on success and error; no outward module reachable without approval_note; free-tier operations per run counted; names and labels per the register.
