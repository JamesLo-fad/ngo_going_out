# Data Import Workflow

**Last Updated**: 2026-01-05
**Purpose**: Document the process of importing CSV data into Cloudflare D1 database

## Overview

Data is imported from CSV files using Node.js scripts that:
1. Read CSV files with Chinese column names
2. Clean and validate data
3. Insert into Cloudflare D1 database via Wrangler CLI

## Source Data

**Location**: `data/` directory (excluded from git)

**Files**:
- `orgs_clean.csv` - 439 organizations, 30 columns
- `policies_clean.csv` - 12 policies, 9 columns

**Format**: CSV with UTF-8 encoding, Chinese headers

## Import Scripts

**Location**: `tools/` directory

### Core Files

1. **helpers.js** - Shared utilities
   - `parseCSVLine()` - Parse CSV with quoted fields
   - `mapHeaders()` - Map Chinese headers to indices
   - `get()` - Get column value by Chinese name
   - `cleanValue()` - Convert empty strings to NULL
   - `shouldSkipRow()` - Check if row should be skipped
   - `d1Exec()` - Execute SQL via Wrangler CLI

2. **import_policies.js** - Import policies
3. **import_orgs.js** - Import organizations

## Data Cleansing

**As of 2026-01-05**, all imports apply data cleansing:

### cleanValue() Function

```javascript
export function cleanValue(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s.toLowerCase() === 'null') return null;
  return s;
}
```

**Converts**:
- Empty string `""` → `null`
- Dash `"-"` → `null`
- String `"null"` → `null`
- Whitespace-only → `null`

**Benefits**:
- Proper NULL representation in database
- Frontend handles NULL correctly
- No more "-" placeholders in UI

## Import Process

### Step 1: Set Environment

```bash
# For production
export D1_DB_NAME=ngo_going_out

# For development
export D1_DB_NAME=ngo_going_out_dev
```

### Step 2: Run Import Script

```bash
# Import policies (fast - 12 records)
node tools/import_policies.js data/policies_clean.csv --mode=replace

# Import organizations (slow - 439 records)
node tools/import_orgs.js data/orgs_clean.csv --mode=replace
```

### Step 3: Verify Import

```bash
# Check record counts
npx wrangler d1 execute $D1_DB_NAME --remote --command="
  SELECT 'orgs' as table_name, COUNT(*) as count FROM orgs
  UNION ALL
  SELECT 'policies', COUNT(*) FROM policies
"

# Sample data
npx wrangler d1 execute $D1_DB_NAME --remote --command="
  SELECT * FROM policies LIMIT 3
"
```

## Import Modes

### Replace Mode (default)

```bash
node tools/import_policies.js data/policies_clean.csv --mode=replace
```

**Behavior**:
- Deletes all existing data
- Imports fresh data from CSV
- Use for: Full data refresh

### Append Mode

```bash
node tools/import_policies.js data/policies_clean.csv --mode=append
```

**Behavior**:
- Keeps existing data
- Inserts new records
- Updates existing records (by ID)
- Use for: Incremental updates

## Column Mapping

### Policies Table

| CSV Column (Chinese) | Database Field | Type | Cleaning |
|---------------------|----------------|------|----------|
| 编号 | id | INTEGER | - |
| 发布时期 | published_date | TEXT | cleanValue() |
| 题目 | title | TEXT | cleanValue() |
| 属性 | doc_type | TEXT | cleanValue() |
| 发布单位（部委）1 | issuer_1 | TEXT | cleanValue() |
| 发布单位（部委）2 | issuer_2 | TEXT | cleanValue() |
| 发布单位（部委）3 | issuer_3 | TEXT | cleanValue() |
| 发布单位（部委）4 | issuer_4 | TEXT | cleanValue() |
| 链接 | link | TEXT | cleanValue() |

### Organizations Table

30 columns total. Key mappings:

| CSV Column (Chinese) | Database Field | Type | Cleaning |
|---------------------|----------------|------|----------|
| 编号 | id | INTEGER | - |
| 组织名称 | org_name | TEXT | cleanValue() |
| 中促会 | in_cnie | INTEGER | parseYesNo() |
| 民促会 | in_cace | INTEGER | parseYesNo() |
| 联合国 | in_un | INTEGER | parseYesNo() |
| 成立时间 | founded_date | TEXT | cleanValue() |
| 出海时间 | go_global_date | TEXT | cleanValue() |
| ... | ... | ... | ... |

**Note**: Production database missing 5 fields (see schema-mismatch.md)

## Special Handling

### Boolean Fields

```javascript
function parseYesNo(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === '是' || s === 'yes' || s === '1' || s === 'true') return 1;
  if (s === '否' || s === 'no' || s === '0' || s === 'false') return 0;
  return null;
}
```

### Numeric Fields

```javascript
donation_pre: (() => {
  const v = get(cols, map, '捐赠金额（出海前）');
  return v ? parseFloat(v) : null;
})()
```

### Row Filtering

```javascript
// Skip if title is empty
if (shouldSkipRow(row, ['title'])) {
  skipped++;
  continue;
}
```

## Performance

### Import Times

- **Policies**: ~30 seconds (12 records)
- **Organizations**: ~5-10 minutes (439 records)

**Why slow?**
- Each record requires separate Wrangler CLI call
- Each call spawns new process
- Network latency to Cloudflare API

**Future optimization**:
- Batch inserts
- Direct API calls instead of CLI
- Parallel processing

## Troubleshooting

### "no such table" Error

**Cause**: Table doesn't exist in database

**Solution**:
```bash
# Check tables
npx wrangler d1 execute $D1_DB_NAME --remote --command="
  SELECT name FROM sqlite_master WHERE type='table'
"

# Create table if needed (see schema documentation)
```

### "no such column" Error

**Cause**: Schema mismatch between script and database

**Solution**:
- Check database schema: `PRAGMA table_info(orgs)`
- Update import script to match production schema
- Or add missing columns to database

### Import Hangs

**Cause**: Network issues or rate limiting

**Solution**:
- Check internet connection
- Wait and retry
- Use `--mode=append` to resume from where it stopped

### Data Not Showing on Website

**Checklist**:
1. Verify import completed successfully
2. Check record count in database
3. Test API endpoint directly
4. Clear browser cache
5. Check for JavaScript errors in console

## Best Practices

### Before Importing

- [ ] Backup existing data (if important)
- [ ] Test on dev database first
- [ ] Verify CSV file encoding (UTF-8)
- [ ] Check CSV has correct headers
- [ ] Estimate import time

### During Import

- [ ] Monitor progress output
- [ ] Don't interrupt the process
- [ ] Check for error messages
- [ ] Note any skipped records

### After Importing

- [ ] Verify record counts
- [ ] Sample check data quality
- [ ] Test website functionality
- [ ] Check for NULL values where expected
- [ ] Document any issues

## Related Documentation

- **Database Schema**: `.claude/technical-notes/database-schema.md`
- **Schema Mismatch Issue**: `.claude/issues/schema-mismatch.md`
- **Data Cleansing Decision**: `.claude/decisions/data-cleansing-approach.md`

---

**Maintained By**: Claude Code + Development Team
