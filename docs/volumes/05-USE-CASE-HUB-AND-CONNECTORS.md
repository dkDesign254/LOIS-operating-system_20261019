# Volume 5: Use case hub, connectors and runs (v1.0, 31 October 2026)

## Concepts
Use case: a complete piece of work with steps, a standard configuration and editable fields. Step kinds: internal (inside LOIS), external (through a connector), person (a human decides). Every outward step must come after a person step (enforced by a unit test).
Run: one execution of a use case. Test runs are simulated and send nothing. Live runs go through a connector after approval.
Connector: a provider (make, n8n, zapier, langchain, odoo, zoho, custom) with a method (webhook or api). Created off.

## Run lifecycle
test: simulated. live: awaiting_approval, then sent (approved) or rejected, then succeeded or failed. Result arrives by callback (reported) or is recorded by a person (verified by a person).

## What every run explains
What, when, why, how, what to expect, how we will know, accuracy level (simulated, reported, verified), what it affects (and what cannot be taken back), options now, and frameworks that fit (Volume 5 appendix).

## Allowances
Defaults 10 test and 3 live runs per day per workspace (Nairobi day). Staff with a second factor change them per workspace in the Staff console; each change is logged. This is what a subscription changes.

## Payload sent to a connector
run_id, use_case (slug), input, config, approval_note, callback_url, callback_token. The Knowledge bank is not sent.

## Callback contract
POST {SITE}/api/v1/run-callback with JSON { run_id, token, result }. 200 and { ok: true } when accepted; 403 otherwise. Result up to 20,000 characters.

## Adding a use case
1. Add a template to `src/lib/use-cases.ts` (steps, standard_config, config_fields, inputs, expectation, measure). Keep a person step before any outward step.
2. Insert the same row into lois_use_cases (a seed script is the next improvement).
3. Add a simulation for its internal steps in `simulate()` in `src/lib/run-record.ts`.
4. Run tests.

## Make API path (built, off)
Method api exists in the connector form and the switch function refuses Make api on a free workspace. Text-to-scenario building through the Make API is planned for when a paid plan exists (Volume 8). Make naming rules are in "LOIS Make Nomenclature and Register v1.0".

## Appendix: frameworks taught
One-way or two-way door; pre-mortem; DACI; cost, benefit and payback; evidence ladder; OODA; urgent and important; five whys; impact and effort; second-order effects; Simple, complicated, complex; SWOT; state your confidence. Each has a lesson and questions in `src/lib/frameworks.ts` and is chosen by rule for each run.
