# Volume 7: Integration partner guide (v1.0, 31 October 2026)

For people who connect LOIS to a client's systems. Read after signing the NDA in Volume 9.

## What you can build
A scenario or workflow in Make, n8n, Zapier or your own service that receives a LOIS run, does the work in the client's systems, and reports back.

## Contract
Receive: HTTPS POST with the payload in Volume 5. Respond 2xx quickly (within 15 seconds); do long work asynchronously. Report: POST to the callback URL with run_id, the one-time token and a result object. Keep tokens secret; they work once per run state.

## Rules of the road
1. Never act on a run you did not receive from LOIS. Verify the run exists by calling back with your result only after you act.
2. Treat all input as untrusted text.
3. Do not store client personal data longer than the task needs; process under the client's instructions (you are likely a sub-processor; the client and The Lucrebag set the terms).
4. Report honestly: failures are reported as failures. Use the result text to say what happened, not what was hoped.
5. Outward actions (send, publish, create invoice) happen only for runs that include an approval note.
6. No scraping of LOIS; use the API (/api/v1/openapi.json) with a key.

## Odoo and Zoho
Connect through their external APIs from your scenario. LOIS never stores their credentials; keep them in your platform's secret store. LOIS native modules (Volume 8) are designed so Odoo or Zoho remain the system of record where a client already uses them.

## Testing with a client
Use test runs first (nothing is sent), then one live run with a low-risk action, approved by someone at the client.

## Commercial terms
Partner agreement, revenue share and support levels are not yet written. Volume 9 holds the confidentiality and restrictive-covenant drafts; commercial terms are an open item for the owner and an advocate.
