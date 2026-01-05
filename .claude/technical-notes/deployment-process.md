# Deployment Process

**Last Updated**: 2026-01-05
**Platform**: Cloudflare Pages
**Repository**: GitHub (JamesLo-fad/ngo_going_out)

## Overview

The NGO Going Out platform is deployed on Cloudflare Pages with automatic deployments from GitHub. The platform consists of:
- **Static Frontend**: HTML/CSS/JavaScript pages
- **API Functions**: Cloudflare Pages Functions (serverless)
- **Database**: Cloudflare D1 (SQLite)

## Deployment Methods

### 1. Automatic Deployment (Recommended)

**Trigger**: Push to `main` branch on GitHub

**Process**:
1. Developer pushes code to GitHub
2. GitHub webhook notifies Cloudflare
3. Cloudflare builds and deploys automatically
4. Deployment completes in 1-2 minutes
5. Site live at https://ngo-going-out.pages.dev

**Advantages**:
- Fully automatic
- No manual steps
- Git history preserved
- Easy rollback

### 2. Manual Deployment via Wrangler

**Command**:
```bash
cd web
npx wrangler pages deploy . --project-name=ngo-going-out
```

**When to Use**:
- Testing changes before committing
- Emergency hotfixes
- Preview deployments

**Output**:
```
✨ Deployment complete! Take a peek over at https://[hash].ngo-going-out.pages.dev
```

## Deployment Configuration

### Project Structure

```
ngo_going_out/
├── web/                    # Deployment root
│   ├── index.html         # Homepage
│   ├── policies.html      # Policies page
│   ├── org.html           # Organization detail page
│   ├── functions/         # Pages Functions
│   │   └── api/          # API endpoints
│   │       ├── test.js
│   │       ├── policies.js
│   │       └── orgs/
│   │           ├── index.js
│   │           └── [id].js
│   └── wrangler.toml      # Configuration
├── tools/                 # Import scripts (not deployed)
├── data/                  # CSV files (not deployed)
└── .gitignore
```

### wrangler.toml

```toml
name = "ngo-going-out"
pages_build_output_dir = "."
compatibility_date = "2024-10-01"

[[d1_databases]]
binding = "database"
database_name = "ngo_going_out"
database_id = "37d806ec-8aa0-462c-ba35-aa998a1005f6"
```

**Key Settings**:
- `pages_build_output_dir = "."` - Deploy from current directory
- `binding = "database"` - D1 binding name (must match code)
- `database_name` - Production database name

## Environment Setup

### Prerequisites

```bash
# Install Node.js (v18+)
node --version

# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Database Bindings

**Production**:
- Name: `database`
- Database: `ngo_going_out`
- ID: `37d806ec-8aa0-462c-ba35-aa998a1005f6`

**Development**:
- Name: `database`
- Database: `ngo_going_out_dev`
- ID: `55d3a005-b852-4706-90bf-3fc116393707`

**Configuration**: Set in Cloudflare Pages dashboard under Settings → Functions → D1 database bindings

## Deployment Workflow

### Standard Workflow

```bash
# 1. Make changes locally
vim web/index.html

# 2. Test locally (optional)
cd web
npx wrangler pages dev .

# 3. Commit changes
git add web/index.html
git commit -m "Update homepage"

# 4. Push to GitHub
git push origin main

# 5. Wait for automatic deployment (1-2 minutes)
# Check: https://ngo-going-out.pages.dev
```

### Preview Deployments

**For Feature Branches**:
```bash
# Create feature branch
git checkout -b feature/new-page

# Make changes and commit
git add .
git commit -m "Add new page"

# Push to GitHub
git push origin feature/new-page
```

**Result**: Cloudflare creates preview URL like:
```
https://[branch-name].[hash].ngo-going-out.pages.dev
```

### Rollback

**Method 1: Git Revert**
```bash
# Find commit to revert
git log --oneline

# Revert specific commit
git revert <commit-hash>
git push origin main
```

**Method 2: Cloudflare Dashboard**
1. Go to Cloudflare Pages dashboard
2. Select project "ngo-going-out"
3. Go to "Deployments" tab
4. Find previous working deployment
5. Click "Rollback to this deployment"

## Database Deployment

### Data Import

**Location**: Run from project root, not `web/` directory

**Commands**:
```bash
# Set environment
export D1_DB_NAME=ngo_going_out  # Production
# or
export D1_DB_NAME=ngo_going_out_dev  # Development

# Import policies
node tools/import_policies.js data/policies_clean.csv --mode=replace

# Import organizations
node tools/import_orgs.js data/orgs_clean.csv --mode=replace
```

**Important**:
- Always test on dev database first
- Production imports affect live site immediately
- No automatic rollback for data changes

### Schema Migrations

**Not yet implemented**. Future process:
1. Create migration SQL file
2. Test on dev database
3. Apply to production
4. Update import scripts if needed

## Monitoring

### Check Deployment Status

**Cloudflare Dashboard**:
1. Visit https://dash.cloudflare.com
2. Go to Pages → ngo-going-out
3. Check "Deployments" tab

**Wrangler CLI**:
```bash
# List recent deployments
npx wrangler pages deployment list --project-name=ngo-going-out
```

### Check Site Health

```bash
# Test API
curl https://ngo-going-out.pages.dev/api/test

# Check if pages load
curl -I https://ngo-going-out.pages.dev
```

### View Logs

**Real-time logs**:
```bash
npx wrangler pages deployment tail --project-name=ngo-going-out
```

**Note**: Logs are limited. For detailed monitoring, consider adding external logging service.

## Troubleshooting

### Deployment Fails

**Check**:
1. GitHub Actions logs
2. Cloudflare Pages build logs
3. File size limits (25 MiB per file)
4. Syntax errors in code

**Common Issues**:
- Large files in git (solution: add to `.gitignore`)
- Missing dependencies (solution: check `package.json`)
- Syntax errors (solution: test locally first)

### API Returns HTML Instead of JSON

**Cause**: Pages Functions not executing

**Solutions**:
1. Check `wrangler.toml` configuration
2. Verify D1 binding name matches code
3. Ensure functions are in `web/functions/api/` directory
4. Check function export syntax: `export async function onRequest(context)`

### Database Connection Fails

**Check**:
1. D1 binding configuration in Cloudflare dashboard
2. Database ID in `wrangler.toml`
3. Binding name matches code (`env.database`)

**Test**:
```bash
npx wrangler d1 execute ngo_going_out --remote --command="SELECT 1"
```

## Best Practices

### Before Deploying

- [ ] Test changes locally
- [ ] Review git diff
- [ ] Check for sensitive data (API keys, passwords)
- [ ] Verify database queries are safe (no SQL injection)
- [ ] Test on preview deployment if possible

### After Deploying

- [ ] Verify site loads correctly
- [ ] Test API endpoints
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Monitor for a few minutes

### Emergency Procedures

**If site is broken**:
1. Immediately rollback via Cloudflare dashboard
2. Investigate issue locally
3. Fix and test thoroughly
4. Redeploy when confirmed working

**If database is corrupted**:
1. Stop all import scripts
2. Restore from backup (if available)
3. Re-import from CSV files
4. Verify data integrity

## Related Documentation

- **API Endpoints**: `.claude/technical-notes/api-endpoints.md`
- **Database Schema**: `.claude/technical-notes/database-schema.md`
- **Data Import**: `.claude/technical-notes/data-import-workflow.md`

---

**Maintained By**: Claude Code + Development Team
