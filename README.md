# NGO Going Out - 中国 NGO 走出去数据平台

A comprehensive web platform for tracking and searching Chinese NGOs with overseas operations. Built with Cloudflare Pages, D1 Database, and Pages Functions.

> **For Developers**: See [README-DEV.md](README-DEV.md) for detailed development documentation and [.claude/](.claude/) for comprehensive technical notes.

## 🌐 Live Website

**Main Website**: https://ngo-going-out.pages.dev

The platform provides:
- Search and browse 439+ Chinese NGOs with international operations
- Detailed organization profiles including mission, projects, and regions
- Policy documents related to NGO overseas activities
- Advanced filtering by country, sector, and organization type
- **R2-based image storage** for organization logos and future media assets

## 📋 Project Overview

This project uses a modern serverless architecture:
- **Cloudflare Pages** - Static site hosting with automatic GitHub deployment
- **Pages Functions** - Serverless API endpoints (in `web/functions/api/`)
- **D1 Database** - SQLite-based serverless database with full-text search
- **GitHub Integration** - Automatic deployment on push to main branch

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │   Static Frontend    │    │   Pages Functions        │  │
│  │   (HTML/CSS/JS)      │───▶│   (/api/*, /cdn/*)       │  │
│  │                      │    │                          │  │
│  │  - index.html        │    │  - API routes            │  │
│  │  - org.html          │    │  - CDN for R2 images     │  │
│  └──────────────────────┘    └──────────┬───────────────┘  │
│                                          │                  │
│                                          ▼                  │
│                               ┌──────────────────────────┐  │
│                               │   D1 Database            │  │
│                               │   (SQLite)               │  │
│                               │                          │  │
│                               │  - orgs (439 records)    │  │
│                               │  - policies (12 records) │  │
│                               │  - Full-text search      │  │
│                               └──────────────────────────┘  │
│                                                              │
│                               ┌──────────────────────────┐  │
│                               │   R2 Storage             │  │
│                               │   (Object Storage)       │  │
│                               │                          │  │
│                               │  - Organization logos    │  │
│                               │  - Future: project imgs  │  │
│                               └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or later)
2. **Wrangler CLI** - Cloudflare's command-line tool
   ```bash
   npm install -g wrangler
   ```
3. **Cloudflare Account** with Pages and D1 enabled
4. **Wrangler Authentication**
   ```bash
   wrangler login
   ```

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ngo_going_out
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a development D1 database**
   ```bash
   wrangler d1 create ngo_going_out_dev
   ```

   Update `wrangler.toml` with the database ID returned.

4. **Initialize database schema**
   ```bash
   wrangler d1 execute ngo_going_out_dev --file=d1/schema.sql
   ```

5. **Import sample data** (optional)
   ```bash
   export D1_DB_NAME=ngo_going_out_dev
   node tools/import_orgs.js data/orgs_clean.csv
   node tools/import_policies.js data/policies.csv
   ```

6. **Start local development**
   ```bash
   npx wrangler pages dev . --d1 database=YOUR_DATABASE_ID
   ```

   Access at `http://localhost:8788`

## 📁 Project Structure

```
ngo_going_out/
├── functions/                    # Pages Functions (API)
│   └── api/
│       ├── test.js              # Diagnostic endpoint
│       ├── health.js            # Health check
│       ├── policies.js          # Policies list
│       └── orgs/                # Organizations endpoints
│           ├── index.js         # List organizations
│           └── [id].js          # Single organization
├── index.html                   # Main search page
├── policies.html                # Policies page
├── org.html                     # Organization detail page
├── _routes.json                 # Pages routing configuration
├── _headers                     # CORS headers
├── wrangler.toml                # Cloudflare Pages configuration
├── d1/
│   └── schema.sql               # Database schema
├── tools/                        # Data import utilities
│   ├── import_orgs.js           # Import organizations from CSV
│   ├── import_policies.js       # Import policies from CSV
│   └── helpers.js               # Shared utilities
├── data/                         # Data files (not in repo)
│   ├── orgs_clean.csv           # Organizations data
│   └── policies_clean.csv       # Policies data
└── README.md                    # This file
```

## 🗄️ Database Schema

The D1 database contains the following tables:

### `orgs` - Organizations
Main table storing NGO information with 439 records.

Key fields:
- `id` - Primary key
- `org_name` - Organization name (Chinese)
- `founded_date` - Founding date
- `go_global_date` - Date of international expansion
- `leaders` - Organization leaders
- `reg_location` - Registration location
- `overseas_regions` - Countries/regions of operation
- `overseas_projects` - International projects
- `overseas_services` - Services provided overseas
- `mission` - Organization mission statement

### `policies` - Policy Documents
Policy documents related to NGO overseas activities (12 records).

### `orgs_facets` - Filters
Extracted facets for filtering (countries, sectors).

### `orgs_fts` & `policies_fts` - Full-Text Search
SQLite FTS5 tables for fast text search.

## 🌍 Deployment to Cloudflare Pages

### Option 1: GitHub Integration (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Pages project in Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Workers & Pages** > **Create application** > **Pages**
   - Connect your GitHub repository
   - Configure build settings:
     - **Build command**: (leave empty)
     - **Build output directory**: `web`
     - **Root directory**: `/`

3. **Configure D1 Binding**
   - In your Pages project, go to **Settings** > **Functions**
   - Scroll to **D1 database bindings**
   - Click **Add binding**
   - Set:
     - **Variable name**: `database`
     - **D1 database**: Select your production database
   - Click **Save**

4. **Deploy**
   - Push to GitHub main branch
   - Cloudflare automatically deploys your changes
   - Your site will be available at `https://your-project.pages.dev`

### Option 2: Direct Deployment with Wrangler

```bash
npx wrangler pages deploy . --project-name=ngo-going-out
```

**Note**: D1 bindings must still be configured in the Dashboard.

## 🔌 API Endpoints

All API endpoints are available at `https://ngo-going-out.pages.dev/api/*`

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "time": "2026-01-04T04:47:48.970Z",
  "db": "ok",
  "count": 439
}
```

### `GET /api/orgs`
List and search organizations with pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `page_size` - Results per page (default: 20)
- `query` - Search term (searches name and regions)

**Example:**
```bash
curl "https://ngo-going-out.pages.dev/api/orgs?page=1&page_size=5"
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "org_name": "爱德基金会",
      "founded_date": "1985-4-1",
      "overseas_regions": "...",
      ...
    }
  ],
  "total": 439,
  "page": 1,
  "page_size": 5
}
```

### `GET /api/orgs/:id`
Get detailed information about a specific organization.

**Example:**
```bash
curl "https://ngo-going-out.pages.dev/api/orgs/1"
```

**Response:**
```json
{
  "id": 1,
  "org_name": "爱德基金会",
  "founded_date": "1985-4-1",
  "leaders": "丘仲辉",
  "overseas_regions": "...",
  "overseas_projects": "...",
  ...
}
```

## 📊 Data Import

### Preparing CSV Data

The import scripts expect CSV files with specific Chinese headers.

**Organizations CSV** (`orgs_clean.csv`):
- 编号, 组织名称, 中促会, 民促会, 联合国
- 成立时间, 出海时间, 领导人, 重要员工
- 资本类型, 注册地, 注册形式
- 捐赠金额（出海前）标注年份, 捐赠金额（出海后）
- 官网的组织理念, 组织结构（参考年报）
- 是否有独立的海外办公室——组织结构
- 官网关于海外项目的组织理念——目标
- 海外项目的名称, 海外涉及的地区
- 海外服务内容, 服务形式
- 主要成员是否有官方背景, 主要信息来源
- 是否有网上披露, 是否持续性披露, 走出去程度

**Policies CSV** (`policies.csv`):
- 编号, 发布日期, 标题, 文件类型
- 发文机关1, 发文机关2, 发文机关3, 发文机关4
- 链接

### Import to Production Database

1. **Set database name**
   ```bash
   export D1_DB_NAME=ngo_going_out
   ```

2. **Import organizations**
   ```bash
   node tools/import_orgs.js data/orgs_clean.csv
   ```

3. **Import policies**
   ```bash
   node tools/import_policies.js data/policies.csv
   ```

The scripts use `--remote` flag to import directly to Cloudflare D1. Progress is shown during import.

### Verify Import

```bash
# Check organization count
wrangler d1 execute ngo_going_out --remote --command "SELECT COUNT(*) FROM orgs"

# Check policies count
wrangler d1 execute ngo_going_out --remote --command "SELECT COUNT(*) FROM policies"

# View sample data
wrangler d1 execute ngo_going_out --remote --command "SELECT id, org_name, overseas_regions FROM orgs LIMIT 5"
```

## 🛠️ Configuration Files

### `wrangler.toml` - Cloudflare Pages Configuration

This is the main configuration file for Cloudflare Wrangler CLI and Pages deployment.

**Current configuration:**
```toml
name = "ngo-going-out"
pages_build_output_dir = "."
compatibility_date = "2024-10-01"

[[d1_databases]]
binding = "database"
database_name = "ngo_going_out"
database_id = "37d806ec-8aa0-462c-ba35-aa998a1005f6"
```

**Configuration explained:**

- **`name`**: Project name, must match your Cloudflare Pages project name
  - Used to identify the deployment target

- **`pages_build_output_dir`**: Source directory for deployment
  - `"."` means current directory (project root)
  - **Critical**: GitHub auto-deployment reads from this directory
  - Must contain `functions/` directory for Pages Functions to deploy
  - **Why `"."` and not `"web"`**: After project restructuring, all files are in root directory. Setting this to `"."` ensures GitHub can find and deploy the `functions/` directory correctly.

- **`compatibility_date`**: Cloudflare Workers runtime compatibility date
  - Locks the Workers API behavior to a specific version
  - Ensures code runs consistently over time
  - Update carefully as it may affect code behavior

- **`[[d1_databases]]`**: D1 database binding configuration
  - **`binding`**: Variable name used in code (`env.database`)
    - **Must match** the name used in your Functions code
    - Example: `const result = await env.database.prepare('SELECT * FROM orgs').all();`
  - **`database_name`**: Human-readable database name
  - **`database_id`**: Unique identifier for the D1 database instance
    - Get this from: `wrangler d1 list`

**Important notes:**

1. **File location**: `wrangler.toml` must be in project root directory
   - GitHub auto-deployment reads this file from repository root

2. **Database binding**: Also needs to be configured in Cloudflare Dashboard
   - Go to: Pages project → Settings → Functions → D1 database bindings
   - Add binding with same name (`database`) and select your database

3. **Why the project was restructured**:
   - **Old structure**: Files in `web/` directory, `pages_build_output_dir = "web"`
   - **Problem**: GitHub auto-deployment couldn't properly deploy Functions from nested `web/functions/` structure
   - **Result**: API endpoints returned HTML instead of JSON (Functions not deployed)
   - **Solution**: Moved all files to root, set `pages_build_output_dir = "."`
   - **Now**: GitHub correctly deploys Functions bundle, APIs return JSON ✅

### `_routes.json`
Routes configuration to ensure `/api/*` and `/cdn/*` requests go to Functions:

```json
{
  "version": 1,
  "include": ["/api/*", "/cdn/*"],
  "exclude": []
}
```

**Critical**: Without `/cdn/*` in this file, image requests will return HTML instead of images. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed explanation.

### `_headers`
CORS headers for API access:

```
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
```

## 🔧 Troubleshooting

### API Returns HTML Instead of JSON

**Problem**: `/api/*` endpoints return HTML (the index.html page) instead of JSON.

**Solution**:
- Ensure D1 binding is configured in Cloudflare Dashboard
- Check that binding variable name is `database`
- Verify `_routes.json` is present in the project root directory
- Redeploy after configuration changes

### Database Connection Errors

**Problem**: API returns "env.database is undefined" or similar errors.

**Solution**:
1. Go to Pages project **Settings** > **Functions**
2. Add D1 database binding:
   - Variable name: `database`
   - D1 database: Select your database
3. Save and wait for automatic redeployment

### Import Script Errors

**Error**: "Please set D1_DB_NAME env var"
```bash
export D1_DB_NAME=ngo_going_out
```

**Error**: CSV parsing errors
- Ensure CSV uses UTF-8 encoding
- Check all required column headers are present
- Verify no extra commas or malformed rows

### CORS Issues

If frontend can't connect to API:
- Check `_headers` file is present in project root
- Verify CORS headers in Functions code
- Check browser console for specific CORS errors

### Deployment Fails

**Check authentication**:
```bash
wrangler whoami
```

**Re-authenticate if needed**:
```bash
wrangler login
```

## 🔄 Updating Data

To update organization or policy data:

1. Export updated CSV from your data source
2. Run import script (uses UPSERT, so existing records are updated):
   ```bash
   export D1_DB_NAME=ngo_going_out
   node tools/import_orgs.js updated_orgs.csv
   ```

## 📦 Database Backups

Export your D1 database:

```bash
# Export to SQL
wrangler d1 export ngo_going_out --output=backup.sql

# Or query specific tables
wrangler d1 execute ngo_going_out --remote --command="SELECT * FROM orgs" --json > orgs_backup.json
```

## 📚 Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Pages Functions Documentation](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## 📝 License

This project is for research and educational purposes.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloudflare documentation
3. Check deployment logs in Cloudflare Dashboard

---

**Last Updated**: January 2026
**Live Site**: https://ngo-going-out.pages.dev
