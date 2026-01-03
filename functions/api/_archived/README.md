# Archived Pages Functions

These Cloudflare Pages Functions have been archived and are no longer in use.

## Reason for Archival

The project now uses the Worker API (`worker/src/index.js`) instead of Pages Functions. The Worker API provides:

- Full-Text Search (FTS) support using SQLite FTS5
- Faceted filtering by country and sector
- Better error handling and debugging
- Unified API architecture

## Issues with These Files

These Pages Functions had several critical issues:

1. **Schema Mismatch**: Queries used incorrect column names that don't exist in the database schema
   - Used `name` instead of `org_name`
   - Used `summary` (doesn't exist in schema)
   - Used `go_out_year` instead of `go_global_date`
   - Used `overseas_office` instead of `has_overseas_office`
   - Used `project_regions` instead of `overseas_projects`
   - Used `services` instead of `overseas_services`

2. **Missing Tables**: Expected tables that weren't defined in schema:
   - `orgs_fts` (now added to schema)
   - `orgs_facets` (now added to schema)
   - `policies_fts` (now added to schema)

3. **Endpoint Conflicts**: Different endpoints than what the frontend expects
   - Pages Functions: `/api/search_orgs`, `/api/search_policies`, `/api/facets_orgs`
   - Worker API: `/api/orgs`, `/api/orgs/:id`, `/api/policies`, `/api/orgs/facets`

## Migration

The frontend (`web/index.html`, `web/org.html`) has been updated to use the Worker API endpoints exclusively.

If you need to reference the old implementation, these files are preserved here for historical purposes.

## Date Archived

2026-01-02
