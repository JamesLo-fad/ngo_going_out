# NGO Going Out - Developer Documentation

**Last Updated**: 2026-01-05
**For**: Internal developers and maintainers
**See Also**: [README.md](README.md) for user-facing documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Database Management](#database-management)
5. [API Development](#api-development)
6. [Frontend Development](#frontend-development)
7. [Deployment](#deployment)
8. [Data Management](#data-management)
9. [Troubleshooting](#troubleshooting)
10. [Development History](#development-history)

## Project Overview

### Technology Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript with Tailwind CSS (CDN)
- **Backend**: Cloudflare Pages Functions (serverless)
- **Database**: Cloudflare D1 (SQLite-based)
- **Hosting**: Cloudflare Pages
- **CI/CD**: GitHub → Cloudflare automatic deployment
- **CLI Tools**: Wrangler (Cloudflare CLI)

### Key Features

- 439 Chinese NGO organizations with international operations
- 12 government policies related to NGO overseas activities
- Search and pagination
- RESTful API endpoints
- Automatic deployment from GitHub

### Architecture Principles

1. **Serverless-First**: No servers to manage
2. **Edge Computing**: Fast global performance
3. **Simple Stack**: Minimal dependencies
4. **Data-Driven**: Database as source of truth

## Development Setup

### Prerequisites

```bash
# Node.js 18+
node --version  # Should be v18.0.0 or higher

# Wrangler CLI
npm install -g wrangler
wrangler --version

# Git
git --version

# Cloudflare account with Pages and D1 access
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/JamesLo-fad/ngo_going_out.git
cd ngo_going_out

# 2. Install dependencies (if any)
npm install

# 3. Login to Cloudflare
wrangler login

# 4. Create development database
wrangler d1 create ngo_going_out_dev
# Note the database ID returned

# 5. Update wrangler.toml with dev database ID
# (Or create a separate wrangler.dev.toml)
```

### Local Development Server

```bash
# Start local development server
npx wrangler pages dev . --d1 database=ngo_going_out_dev

# Server will start at http://localhost:8788
# API available at http://localhost:8788/api/*
```

**Note**: Local development uses the remote D1 database, not a local SQLite file.

## Project Structure

```
ngo_going_out/
├── .claude/                    # Claude Code documentation
│   ├── README.md              # Documentation guide
│   ├── sessions/              # Session reports
│   ├── decisions/             # Technical decisions
│   ├── issues/                # Problem documentation
│   └── technical-notes/       # Technical docs
├── .git/                      # Git repository
├── .gitignore                 # Git ignore rules
├── .wrangler/                 # Wrangler cache (gitignored)
├── data/                      # CSV source files (gitignored)
│   ├── orgs_clean.csv        # 439 organizations
│   └── policies_clean.csv    # 12 policies
├── tools/                     # Data import scripts
│   ├── helpers.js            # Shared utilities
│   ├── import_orgs.js        # Import organizations
│   └── import_policies.js    # Import policies
├── functions/                 # Pages Functions
│   └── api/                  # API endpoints
│       ├── test.js           # Diagnostic endpoint
│       ├── health.js         # Health check
│       ├── policies.js       # Policies list
│       └── orgs/             # Organizations endpoints
│           ├── index.js      # List orgs
│           └── [id].js       # Single org
├── index.html                 # Homepage (org search)
├── policies.html              # Policies page
├── org.html                   # Organization detail
├── _routes.json               # Pages routing configuration
├── _headers                   # CORS headers
├── wrangler.toml              # Cloudflare configuration
├── d1/                        # Database schema
│   └── schema.sql
├── README.md                  # User documentation
└── README-DEV.md             # This file

```

### Key Directories

- **`.claude/`**: Documentation for Claude Code (AI assistant)
- **`data/`**: CSV source files (not in git, too large)
- **`tools/`**: Node.js scripts for data import
- **`functions/api/`**: Serverless API endpoints (Pages Functions)
- **`d1/`**: Database schema files

## Database Management

### Database Environments

| Environment | Name | ID | Purpose |
|-------------|------|----|---------|
| Production | `ngo_going_out` | `37d806ec-8aa0-462c-ba35-aa998a1005f6` | Live site |
| Development | `ngo_going_out_dev` | `55d3a005-b852-4706-90bf-3fc116393707` | Testing |

### Schema

**Tables**:
- `orgs` - 439 organizations (25 fields in production)
- `policies` - 12 policies (9 fields)
- `orgs_facets` - Faceted search (dev only, not in production)

**Important**: Production database is missing 5 fields from orgs table:
- `donation_post_year`
- `disclosed_online`
- `disclosed_continuous`
- `go_out_level`
- `logo_url`

See `.claude/technical-notes/database-schema.md` for full schema documentation.

### Common Database Operations

```bash
# Query database
npx wrangler d1 execute ngo_going_out --remote --command="SELECT COUNT(*) FROM orgs"

# Check schema
npx wrangler d1 execute ngo_going_out --remote --command="PRAGMA table_info(orgs)"

# Export data
npx wrangler d1 execute ngo_going_out --remote --command="SELECT * FROM policies" --json > policies_backup.json

# List databases
npx wrangler d1 list
```

### Data Import

```bash
# Set environment
export D1_DB_NAME=ngo_going_out_dev  # or ngo_going_out for production

# Import policies (fast - ~30 seconds)
node tools/import_policies.js data/policies_clean.csv --mode=replace

# Import organizations (slow - ~5-10 minutes)
node tools/import_orgs.js data/orgs_clean.csv --mode=replace
```

**Modes**:
- `--mode=replace` - Delete all data and import fresh (default)
- `--mode=append` - Keep existing data, insert/update new records

**Important**: Always test on dev database first!

## API Development

### Creating New Endpoints

**File location**: `functions/api/your-endpoint.js`

**Template**:
```javascript
export async function onRequest(context) {
  const { request, env, params } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Your logic here
    const result = await env.database.prepare('SELECT * FROM orgs LIMIT 10').all();

    return new Response(JSON.stringify(result.results), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
```

### Database Access

```javascript
// Simple query
const result = await env.database.prepare('SELECT * FROM orgs').all();
// result.results = array of rows

// Parameterized query (ALWAYS use this for user input)
const result = await env.database.prepare('SELECT * FROM orgs WHERE id = ?')
  .bind(id)
  .first();
// result = single row object

// Multiple parameters
const result = await env.database.prepare('SELECT * FROM orgs WHERE org_name LIKE ? LIMIT ?')
  .bind(`%${query}%`, 10)
  .all();
```

**Security**: NEVER concatenate user input into SQL strings. Always use parameterized queries.

### Testing APIs Locally

```bash
# Start dev server
npx wrangler pages dev .

# Test in another terminal
curl http://localhost:8788/api/test
curl http://localhost:8788/api/orgs
curl "http://localhost:8788/api/orgs?query=非洲"
```

## Frontend Development

### Pages

- **index.html** - Homepage with organization search
- **policies.html** - Policies search page
- **org.html** - Organization detail page (reads ID from URL hash)

### Styling

Uses **Tailwind CSS** via CDN:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

**Pros**: No build step, fast development
**Cons**: Larger initial load, no tree-shaking

### JavaScript Patterns

**Fetch API**:
```javascript
const response = await fetch('/api/orgs?page=1&page_size=20');
const data = await response.json();
```

**Error Handling**:
```javascript
try {
  const response = await fetch('/api/orgs');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
} catch (error) {
  console.error(error);
  // Show error to user
}
```

**Data Cleaning**:
```javascript
function displayValue(v) {
  if (v === null || v === undefined || v === '' || v === 'null') {
    return '<span class="text-gray-400">-</span>';
  }
  return escapeHtml(String(v));
}
```

### Important Lessons

**DO NOT** modify working frontend code without thorough testing. See `.claude/issues/conditional-rendering-failures.md` for why.

**Principle**: "Fix the data, not the display" - If display issues stem from data quality, fix the data source.

## Deployment

### Automatic Deployment

**Trigger**: Push to `main` branch

**Process**:
1. Push code to GitHub
2. GitHub webhook → Cloudflare
3. Cloudflare builds and deploys
4. Live in 1-2 minutes

### Manual Deployment

```bash
npx wrangler pages deploy . --project-name=ngo-going-out
```

### Preview Deployments

Create feature branch → Push to GitHub → Cloudflare creates preview URL

### Rollback

**Method 1**: Git revert + push
```bash
git revert <commit-hash>
git push origin main
```

**Method 2**: Cloudflare dashboard → Deployments → Rollback

## Data Management

### CSV Files

**Location**: `data/` directory (not in git)

**Format**:
- UTF-8 encoding
- Chinese column headers
- Comma-separated
- Quoted fields for values containing commas

**Columns**:
- `orgs_clean.csv`: 30 columns, 439 rows
- `policies_clean.csv`: 9 columns, 12 rows

### Data Cleansing

As of 2026-01-05, import scripts apply automatic cleansing:
- Empty strings → NULL
- "-" → NULL
- "null" (string) → NULL

**Why**: Frontend code handles NULL correctly, preventing "-" placeholders in UI.

See `.claude/decisions/data-cleansing-approach.md` for full rationale.

### Updating Data

```bash
# 1. Update CSV file in data/ directory
vim data/orgs_clean.csv

# 2. Test import on dev database
export D1_DB_NAME=ngo_going_out_dev
node tools/import_orgs.js data/orgs_clean.csv --mode=replace

# 3. Verify on dev site
# (Need to set up dev environment first)

# 4. Import to production
export D1_DB_NAME=ngo_going_out
node tools/import_orgs.js data/orgs_clean.csv --mode=replace

# 5. Verify on live site
curl https://ngo-going-out.pages.dev/api/orgs
```

## Troubleshooting

### "加载失败" (Load Failed) Error

**Symptoms**: Website shows "加载失败，请稍后重试"

**Causes**:
1. API returning HTML instead of JSON
2. JavaScript error in frontend
3. Database connection failure
4. CORS issues

**Solutions**:
```bash
# Check API directly
curl https://ngo-going-out.pages.dev/api/test

# Check browser console for errors
# (Open DevTools → Console)

# Verify database binding
npx wrangler d1 execute ngo_going_out --remote --command="SELECT 1"
```

### API Returns HTML Instead of JSON

**Cause**: Pages Functions not executing

**Check**:
1. Functions in correct directory (`functions/api/`)
2. Correct export: `export async function onRequest(context)`
3. D1 binding configured in Cloudflare dashboard
4. Binding name matches code (`env.database`)

### Database Import Fails

**Common errors**:

1. **"no such table"**
   - Table doesn't exist
   - Solution: Check database name, verify schema

2. **"no such column"**
   - Schema mismatch
   - Solution: See `.claude/issues/schema-mismatch.md`

3. **Import hangs**
   - Network issues
   - Solution: Check connection, wait and retry

### Local Development Issues

**Port already in use**:
```bash
# Kill process on port 8788
lsof -ti:8788 | xargs kill -9
```

**Database binding not working**:
- Verify database ID in wrangler.toml
- Check binding name matches code
- Ensure logged into Wrangler

## Development History

### Key Milestones

**2026-01-05**:
- ✅ Implemented data cleansing approach
- ✅ Fixed policies empty field display issue
- ✅ Created comprehensive .claude/ documentation
- ✅ Resolved schema mismatch for orgs import
- ⚠️ Two failed attempts at frontend conditional rendering (reverted)

**Earlier**:
- Initial project setup
- Database schema creation
- API endpoints implementation
- Frontend pages development

### Important Decisions

1. **Data Cleansing Over Frontend Changes** (2026-01-05)
   - Chose to clean data at source instead of complex frontend logic
   - See `.claude/decisions/data-cleansing-approach.md`

2. **Vanilla JavaScript Over Framework**
   - Simpler deployment, no build step
   - Trade-off: Less structure, more manual work

3. **Cloudflare Pages Over Traditional Hosting**
   - Serverless, global CDN, automatic scaling
   - Trade-off: Vendor lock-in, D1 limitations

### Known Issues

1. **Schema Mismatch**: Production database missing 5 fields
   - Impact: Cannot import full dataset
   - Workaround: Import scripts skip missing fields
   - See `.claude/issues/schema-mismatch.md`

2. **No Full-Text Search**: Using LIKE queries instead of FTS5
   - Impact: Slower, less accurate search
   - Future: Implement FTS5 virtual tables

3. **Date Format Inconsistency**: Dates stored as TEXT in various formats
   - Impact: Cannot sort/filter reliably
   - Future: Normalize during import

## Best Practices

### Code Changes

- ✅ Test locally before deploying
- ✅ Use feature branches for experiments
- ✅ Test on dev database before production
- ✅ Document significant changes
- ❌ Never modify working code without testing
- ❌ Never commit sensitive data (API keys, passwords)

### Database Operations

- ✅ Always use parameterized queries
- ✅ Test on dev database first
- ✅ Backup before major changes
- ✅ Verify data after import
- ❌ Never concatenate user input into SQL
- ❌ Never run untested queries on production

### Documentation

- ✅ Update .claude/ docs after significant work
- ✅ Document decisions and rationale
- ✅ Keep README files current
- ✅ Add comments for complex logic
- ❌ Don't delete historical information
- ❌ Don't let docs become outdated

## Resources

### Internal Documentation

- `.claude/README.md` - Documentation guide
- `.claude/technical-notes/` - Technical details
- `.claude/decisions/` - Decision records
- `.claude/issues/` - Problem documentation

### External Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

### Getting Help

1. Check `.claude/` documentation first
2. Search issues in `.claude/issues/`
3. Review technical notes in `.claude/technical-notes/`
4. Check Cloudflare documentation
5. Ask team members or create GitHub issue

---

**Maintained By**: Development Team + Claude Code
**Last Major Update**: 2026-01-05 (Data cleansing implementation)
**Next Review**: When significant changes are made
