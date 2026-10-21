# Compatibility policy

LOIS is meant to be plugged into other tools, so integrations must not break when LOIS improves, and LOIS must keep working when connected tools are older.

## API (`/api/v1`)

- **Additive only.** v1 gains new optional request fields and new response fields. It never removes or renames a field, changes a type, or tightens validation of something that was accepted before.
- **Tolerant reader.** Clients must ignore response fields they don't recognise. The server ignores request fields it doesn't recognise and accepts documented aliases (`q` for `query`).
- **Version signalled** on every response in the `LOIS-API-Version` header and in the body (`api_version`).
- **Breaking change = new version.** Anything incompatible ships as `/api/v2`. v1 keeps running for at least 12 months after v2 is announced, with a `Deprecation` header added to v1 responses first.
- **Stable error shape:** `{ "api_version": "1", "error": { "code": "...", "message": "..." } }`. Codes are stable; messages may be reworded.

## Webhooks

- Envelope: `{ id, api_version, type, created, tenant_id, data }`. New event types and new `data` fields can appear; consumers should ignore what they don't use and not fail on unknown `type` values.
- Signature header format `t=<unix>,v1=<hex>`. A future `v2=` scheme would be sent alongside `v1=` during a transition.

## Database

- Changes are forward migrations only, recorded in `lois_migration_registry` (KB-001 onwards) and kept in `supabase/migrations/`.
- Columns are added, not repurposed. `lois_knowledge_items.schema_version` marks the entry shape so old rows stay readable.
- Approved bank entries are immutable. Corrections are new versions that supersede the old one, so history and citations stay valid.
- Public RPCs (`lois_*`) keep their argument lists. New behaviour arrives as new optional arguments with defaults, or as new functions.

## Rolling back

- App: promote the previous deployment in Vercel (instant).
- Database: forward-fix migrations; never edit applied ones.
