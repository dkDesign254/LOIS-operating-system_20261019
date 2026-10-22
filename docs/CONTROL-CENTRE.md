# LOIS Control Centre in the app (KB-011)

Ported from the Control Centre v0.5 artefact (single-file HTML) into the Next.js app, with the two things the artefact lacked: real role enforcement in the database and permanent storage.

| Artefact section | App page | Notes |
|---|---|---|
| Start here (tiles, decision readiness, next actions, Brief me) | `/app/control` | Counts come from the database. "Brief me" needs `ANTHROPIC_API_KEY`. |
| Business arms | `/app/arms` | Cards show a dash until a KPI has a source. |
| Automations (Make register) | `/app/automations` | Recorded snapshot (15 Oct 2026), not a live feed. |
| Decisions and governance | `/app/decisions`, `/app/decisions/[id]` | Drafts first; five separate readiness measures; evidence requests; challenge points; versioned decision records; audit log; execution handoff preview; learning review. |
| Data and backups | `/app/continuity` | Continuity items and the free backup routine. |
| Sandbox (7 tools) | `/app/sandbox` | Running a tool needs `ANTHROPIC_API_KEY`; the flow, measure and instruction are always visible and copyable. |
| Learn LOIS | `/app/learn` | Role induction, tour (stored on the device), glossary. |
| Memory and Ask LOIS | `/app/memory`, `/app` | Ask answers only from approved knowledge, with citations. |

## What the database enforces (not just the screen)

- Only owner, admin or reviewer can record a decision (`lois_record_decision`, 42501 otherwise).
- A reason of 8+ characters is required; a high-risk request cannot be approved without evidence; a decided request cannot be decided again.
- Records are append-only, versioned (`brief-v1`, `v2`...), have a unique correlation id, and `executed` is constrained to false.
- Members can draft and submit but cannot set approved/rejected or the version.
- The audit log accepts inserts only (no update or delete policy).

## Seed data (The Lucrebag workspace)

13 automations and 7 continuity items from the 15 Oct 2026 snapshot, 4 business arms (no figures), and 5 open actions from the 15 Oct audit. Labelled with their source; none is marked verified.

## Not ported

- The artefact's "Example data" switch: the app holds only real or labelled records.
- Live Make state: the register is a snapshot until a connector is added.
