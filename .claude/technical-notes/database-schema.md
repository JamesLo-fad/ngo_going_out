# Database Schema Documentation

**Last Updated**: 2026-01-05
**Database**: Cloudflare D1 (SQLite)
**Environments**:
- Production: `ngo_going_out` (37d806ec-8aa0-462c-ba35-aa998a1005f6)
- Development: `ngo_going_out_dev` (55d3a005-b852-4706-90bf-3fc116393707)

## Overview

The NGO Going Out platform uses Cloudflare D1, a serverless SQL database built on SQLite. The database stores information about Chinese NGOs operating internationally and related government policies.

## Tables

### 1. `orgs` - Organizations

Stores information about NGOs that have "gone global" (走出去).

**Schema** (Production):
```sql
CREATE TABLE orgs (
  id INTEGER PRIMARY KEY,
  org_name TEXT NOT NULL,
  in_cnie INTEGER,                    -- 中促会 (0/1/NULL)
  in_cace INTEGER,                    -- 民促会 (0/1/NULL)
  in_un INTEGER,                      -- 联合国 (0/1/NULL)
  founded_date TEXT,
  go_global_date TEXT,
  leaders TEXT,
  key_staff TEXT,
  capital_type TEXT,
  reg_location TEXT,
  reg_type TEXT,
  donation_pre REAL,
  donation_pre_year TEXT,
  donation_post REAL,
  -- donation_post_year TEXT,         -- Missing in production!
  mission TEXT,
  org_structure TEXT,
  has_overseas_office INTEGER,
  overseas_mission TEXT,
  overseas_projects TEXT,
  overseas_regions TEXT,
  overseas_services TEXT,
  service_mode TEXT,
  has_official_background INTEGER,
  sources TEXT
  -- disclosed_online INTEGER,        -- Missing in production!
  -- disclosed_continuous INTEGER,    -- Missing in production!
  -- go_out_level TEXT,               -- Missing in production!
  -- logo_url TEXT                    -- Missing in production!
);
```

**Record Count**: 439 organizations

**Key Fields**:
- `org_name`: Organization name (required)
- `overseas_regions`: Countries/regions where org operates
- `overseas_services`: Services provided internationally
- `go_global_date`: When organization started international operations

**Data Quality Notes**:
- Empty fields stored as NULL (after 2026-01-05 data cleansing)
- Boolean fields (in_cnie, in_cace, etc.) use INTEGER: 0=No, 1=Yes, NULL=Unknown
- Dates stored as TEXT in various formats (not standardized)

### 2. `policies` - Government Policies

Stores Chinese government policies related to NGO international operations.

**Schema**:
```sql
CREATE TABLE policies (
  id INTEGER PRIMARY KEY,
  published_date TEXT,
  title TEXT,
  doc_type TEXT,
  issuer_1 TEXT,
  issuer_2 TEXT,
  issuer_3 TEXT,
  issuer_4 TEXT,
  link TEXT
);
```

**Record Count**: 12 policies (after 2026-01-05 import)

**Key Fields**:
- `title`: Policy title (required)
- `issuer_1-4`: Up to 4 government agencies that issued the policy
- `link`: URL to official policy document

**Data Quality Notes**:
- Empty issuer fields stored as NULL (not empty strings)
- Most policies have only 1-2 issuers
- All policies have links to official government websites

### 3. `orgs_facets` - Organization Facets (Dev Only)

**Status**: ⚠️ NOT AVAILABLE IN PRODUCTION

This table exists in development but not in production database. It stores normalized country and sector information for search/filtering.

**Schema** (Dev only):
```sql
CREATE TABLE orgs_facets (
  org_id INTEGER,
  country TEXT,
  sector TEXT,
  FOREIGN KEY (org_id) REFERENCES orgs(id)
);
```

**Purpose**: Enable faceted search by country and sector

**Why Missing in Production**: Production database was created with older schema version

## Schema Differences: Dev vs Production

| Feature | Development | Production | Impact |
|---------|-------------|------------|--------|
| `orgs.donation_post_year` | ✅ Exists | ❌ Missing | Cannot store post-donation year |
| `orgs.disclosed_online` | ✅ Exists | ❌ Missing | Cannot track online disclosure |
| `orgs.disclosed_continuous` | ✅ Exists | ❌ Missing | Cannot track continuous disclosure |
| `orgs.go_out_level` | ✅ Exists | ❌ Missing | Cannot categorize internationalization level |
| `orgs.logo_url` | ✅ Exists | ❌ Missing | Cannot store organization logos |
| `orgs_facets` table | ✅ Exists | ❌ Missing | No faceted search in production |

**Workaround**: Import scripts modified to skip missing fields in production

## Data Import Process

### Source Files

Located in `data/` directory (not in git due to size):
- `orgs_clean.csv` - 439 organizations, 30 columns
- `policies_clean.csv` - 12 policies, 9 columns

### Import Scripts

Located in `tools/` directory:
- `import_orgs.js` - Import organizations
- `import_policies.js` - Import policies
- `helpers.js` - Shared utilities including `cleanValue()`

### Import Commands

```bash
# Set database name
export D1_DB_NAME=ngo_going_out        # Production
export D1_DB_NAME=ngo_going_out_dev    # Development

# Import policies
node tools/import_policies.js data/policies_clean.csv --mode=replace

# Import organizations
node tools/import_orgs.js data/orgs_clean.csv --mode=replace
```

### Data Cleansing

As of 2026-01-05, import scripts apply data cleansing:

**`cleanValue()` function**:
- Converts `""` (empty string) → `null`
- Converts `"-"` → `null`
- Converts `"null"` (string) → `null`
- Trims whitespace

**Benefits**:
- Proper NULL representation in database
- Frontend code handles NULL correctly
- No more "-" placeholders in UI

## Querying the Database

### Using Wrangler CLI

```bash
# Query production database
npx wrangler d1 execute ngo_going_out --remote --command="SELECT * FROM orgs LIMIT 5"

# Query development database
npx wrangler d1 execute ngo_going_out_dev --remote --command="SELECT * FROM policies"

# Check table schema
npx wrangler d1 execute ngo_going_out --remote --command="PRAGMA table_info(orgs)"

# Count records
npx wrangler d1 execute ngo_going_out --remote --command="SELECT COUNT(*) FROM orgs"
```

### Common Queries

**Find organizations by region**:
```sql
SELECT org_name, overseas_regions
FROM orgs
WHERE overseas_regions LIKE '%非洲%'
LIMIT 10;
```

**Find policies by issuer**:
```sql
SELECT title, issuer_1, published_date
FROM policies
WHERE issuer_1 LIKE '%国务院%'
ORDER BY published_date DESC;
```

**Organizations with overseas offices**:
```sql
SELECT org_name, overseas_regions
FROM orgs
WHERE has_overseas_office = 1;
```

## API Endpoints

The database is accessed through Cloudflare Pages Functions:

### GET `/api/orgs`

**Parameters**:
- `page` (default: 1)
- `page_size` (default: 20)
- `query` (optional search term)

**Response**:
```json
{
  "items": [...],
  "total": 439,
  "page": 1,
  "page_size": 20
}
```

### GET `/api/orgs/:id`

**Response**: Single organization object

### GET `/api/policies`

**Parameters**:
- `page` (default: 1)
- `page_size` (default: 20)
- `query` (optional search term)

**Response**:
```json
{
  "items": [...],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

## Known Issues

### 1. Schema Mismatch

**Problem**: Production database missing 5 fields from orgs table

**Impact**: Cannot import full dataset to production

**Workaround**: Import scripts skip missing fields

**Solution**: Need to run ALTER TABLE migrations (not yet implemented)

### 2. Date Format Inconsistency

**Problem**: Dates stored as TEXT in various formats
- Some: "2020-01-15"
- Some: "2020年1月"
- Some: "2020"

**Impact**: Cannot sort or filter by date reliably

**Solution**: Need date normalization during import

### 3. No Full-Text Search

**Problem**: SQLite full-text search (FTS5) not configured

**Impact**: Search uses LIKE queries (slower, less accurate)

**Solution**: Could add FTS5 virtual tables

## Future Improvements

### Schema Migrations

**Priority**: High

**Tasks**:
1. Create migration scripts
2. Add missing fields to production
3. Sync dev and production schemas
4. Version control schema changes

### Data Validation

**Priority**: Medium

**Tasks**:
1. Add CHECK constraints
2. Validate dates during import
3. Normalize country names
4. Standardize sector categories

### Performance Optimization

**Priority**: Low (current performance is good)

**Tasks**:
1. Add indexes on frequently queried fields
2. Implement FTS5 for better search
3. Consider materialized views for facets

## Maintenance

### Backup Strategy

Cloudflare D1 provides automatic backups. To export data:

```bash
# Export to SQL
npx wrangler d1 export ngo_going_out --remote --output=backup.sql

# Export specific table
npx wrangler d1 execute ngo_going_out --remote --command="SELECT * FROM orgs" --json > orgs_backup.json
```

### Monitoring

Check database size and health:

```bash
# Database info
npx wrangler d1 info ngo_going_out

# Table sizes
npx wrangler d1 execute ngo_going_out --remote --command="
  SELECT name,
         (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as tables
  FROM sqlite_master m
  WHERE type='table'
"
```

## Related Documentation

- **API Endpoints**: `.claude/technical-notes/api-endpoints.md`
- **Data Import**: `.claude/technical-notes/data-import-workflow.md`
- **Schema Mismatch Issue**: `.claude/issues/schema-mismatch.md`

---

**Maintained By**: Claude Code + Development Team
**Questions**: Refer to README-DEV.md or .claude/ documentation
