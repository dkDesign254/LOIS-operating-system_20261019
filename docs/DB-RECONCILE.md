# Database changes applied live but not yet exported as runnable migration files

KB-025: business areas (modules), several businesses per workspace, sharing between them.
Applied live in pieces: kb_25a (tables, seed), then the functions below through the SQL runner.
A row of data belongs to one business, or to none (null business_id = shared across the workspace).
Tables: lois_areas (catalogue), lois_businesses, lois_business_areas (state on|wanted, active flag), lois_business_shares (contacts|products|stock|ledger).
The catalogue seed (24 areas: 3 core always-on, 11 live/beta, 10 planned) lives in docs/seed-business-areas.sql.
Functions (owner/admin only, all logged in lois_admin_log): lois_business_save, lois_area_set (needs its required areas on, or p_with_needs; off is refused while another area needs it), lois_share_set.
Planned areas can only be marked "wanted" (demand signal); they do not unlock anything until built.

Also pending: KB-023 (use case hub) was applied live as kb_23a, kb_23b, kb_23c; the repo file differs (see Volume 4). 
Plan: export the live function bodies with pg_get_functiondef and the catalogue as INSERTs, then replace this note with real migration files and a check that replays them on a scratch database.
