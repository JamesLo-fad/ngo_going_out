# NGO Going Out - Project Documentation

A Cloudflare-based web application for tracking and searching Chinese NGOs with overseas operations. Built with Cloudflare Workers, D1 Database, and Pages.

## Project Overview

This project consists of:
- **Cloudflare Worker API** (`worker/src/index.js`) - REST API for organizations and policies
- **D1 Database** - SQLite database with full-text search
- **Static Web Frontend** (`web/`) - HTML/CSS/JS interface
- **Image Proxy Worker** (`image-proxy/`) - Proxy for organization logos
- **Data Import Tools** (`tools/`) - Scripts to import CSV data

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or later)
2. **Wrangler CLI** - Cloudflare's command-line tool
   ```bash
   npm install -g wrangler
   ```
3. **Cloudflare Account** with Workers and Pages enabled
4. **Wrangler Authentication**
   ```bash
   wrangler login
   ```

## Project Structure

```
ngo_going_out/
├── worker/src/index.js    # Main API Worker
├── web/                   # Static frontend files
│   ├── index.html        # Main search page
│   └── org.html          # Organization detail page
├── image-proxy/          # Image proxy worker
├── d1/schema.sql         # Database schema
├── tools/                # Data import scripts
│   ├── import_orgs.js    # Import organizations
│   ├── import_policies.js # Import policies
│   └── helpers.js        # Shared utilities
└── wrangler.toml         # Cloudflare configuration
```

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database (Development)

The development database is already configured in `wrangler.toml`:
- Database name: `ngo_going_out_dev`
- Database ID: `55d3a005-b852-4706-90bf-3fc116393707`

If you need to create a new dev database:

```bash
wrangler d1 create ngo_going_out_dev
```

Update the `database_id` in `wrangler.toml` under `[[d1_databases]]` section.

### 3. Initialize Database Schema

Apply the schema to your development database:

```bash
wrangler d1 execute ngo_going_out_dev --file=d1/schema.sql
```

This creates:
- `orgs` table - Organization data
- `policies` table - Policy documents
- `orgs_facets` table - Country/sector filters
- `orgs_fts` and `policies_fts` - Full-text search tables
- Indexes and triggers for automatic FTS sync

### 4. Start Local Development Server

```bash
wrangler dev
```

This starts the Worker API at `http://localhost:8787`

Test the API:
```bash
curl http://localhost:8787/api/health
```

### 5. Serve Frontend Locally

In a separate terminal, serve the web directory:

```bash
cd web
python3 -m http.server 8080
```

Or use any static file server. Access at `http://localhost:8080`

## Data Import

### Preparing Your Data

The import scripts expect CSV files with specific headers:

**Organizations CSV** (`orgs.csv`):
Required columns (Chinese headers):
- 编号, 组织名称, 中促会, 民促会, 联合国, 成立时间, 出海时间
- 领导人, 重要员工, 资本类型, 注册地, 注册形式
- 捐赠金额（出海前）标注年份, 捐赠金额（出海后）
- 官网的组织理念, 组织结构（参考年报）
- 是否有独立的海外办公室——组织结构
- 官网关于海外项目的组织理念——目标
- 海外项目的名称, 海外涉及的地区, 海外服务内容, 服务形式
- 主要成员是否有官方背景, 主要信息来源
- 是否有网上披露, 是否持续性披露, 走出去程度

**Policies CSV** (`policies.csv`):
Required columns (Chinese headers):
- 编号, 发布日期, 标题, 文件类型
- 发文机关1, 发文机关2, 发文机关3, 发文机关4
- 链接

### Import Organizations

```bash
# Set the database name
export D1_DB_NAME=ngo_going_out_dev

# Import organizations from CSV
node tools/import_orgs.js path/to/orgs.csv
```

The script will:
- Parse the CSV file
- Insert/update organizations in the `orgs` table
- Automatically populate `orgs_facets` for filtering
- Trigger FTS index updates

Progress is shown every 100 records.

### Import Policies

```bash
# Set the database name
export D1_DB_NAME=ngo_going_out_dev

# Import policies from CSV
node tools/import_policies.js path/to/policies.csv
```

### Verify Data Import

Check the data in your D1 database:

```bash
# Count organizations
wrangler d1 execute ngo_going_out_dev --command="SELECT COUNT(*) FROM orgs"

# Count policies
wrangler d1 execute ngo_going_out_dev --command="SELECT COUNT(*) FROM policies"

# View sample organizations
wrangler d1 execute ngo_going_out_dev --command="SELECT id, org_name, overseas_regions FROM orgs LIMIT 5"
```

## Cloudflare Production Setup

### 1. Create Production D1 Database

```bash
wrangler d1 create ngo_going_out
```

This will output a database ID. Update `wrangler.toml` under `[env.production.d1_databases]`:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "ngo_going_out"
database_id = "YOUR_PRODUCTION_DATABASE_ID"
```

### 2. Initialize Production Database

Apply the schema to production:

```bash
wrangler d1 execute ngo_going_out --env production --file=d1/schema.sql
```

### 3. Import Data to Production

```bash
# Set production database name
export D1_DB_NAME=ngo_going_out

# Import organizations
node tools/import_orgs.js path/to/orgs.csv

# Import policies
node tools/import_policies.js path/to/policies.csv
```

### 4. Deploy API Worker

Deploy the Worker to production:

```bash
wrangler deploy --env production
```

This deploys the Worker from `worker/src/index.js` with production configuration.

The Worker will be available at: `https://ngo-api.YOUR_SUBDOMAIN.workers.dev`

### 5. Deploy Image Proxy Worker

```bash
cd image-proxy
wrangler deploy --env production
cd ..
```

The image proxy will be available at: `https://ngo-img-proxy.YOUR_SUBDOMAIN.workers.dev`

### 6. Deploy Frontend to Cloudflare Pages

#### Option A: Using Wrangler

```bash
wrangler pages deploy web --project-name=ngo-going-out
```

#### Option B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **Create application** > **Pages**
3. Connect your Git repository or upload files directly
4. Set build settings:
   - **Build command**: (leave empty - static site)
   - **Build output directory**: `/web`
   - **Root directory**: `/`

#### Configure Pages Environment Variables

In the Pages settings, add these environment variables:

- `API_BASE_URL`: Your Worker API URL (e.g., `https://ngo-api.YOUR_SUBDOMAIN.workers.dev`)
- `IMAGE_PROXY_URL`: Your image proxy URL (e.g., `https://ngo-img-proxy.YOUR_SUBDOMAIN.workers.dev`)

### 7. Update Frontend API Endpoints

Edit `web/index.html` and `web/org.html` to point to your production API:

```javascript
// Replace localhost URLs with production URLs
const API_BASE = 'https://ngo-api.YOUR_SUBDOMAIN.workers.dev';
```

### 8. Configure Custom Domain (Optional)

#### For Pages:
1. Go to your Pages project > **Custom domains**
2. Add your domain (e.g., `ngo.yourdomain.com`)
3. Follow DNS configuration instructions

#### For Workers:
1. Go to your Worker > **Settings** > **Triggers**
2. Add a custom domain or route

## Testing

### Test API Endpoints

Once deployed, test your API:

```bash
# Health check
curl https://ngo-api.YOUR_SUBDOMAIN.workers.dev/api/health

# List organizations (with pagination)
curl "https://ngo-api.YOUR_SUBDOMAIN.workers.dev/api/orgs?page=1&limit=20"

# Search organizations
curl "https://ngo-api.YOUR_SUBDOMAIN.workers.dev/api/orgs?q=环保"

# Get organization details
curl https://ngo-api.YOUR_SUBDOMAIN.workers.dev/api/orgs/1

# Get facets (filters)
curl https://ngo-api.YOUR_SUBDOMAIN.workers.dev/api/orgs/facets

# List policies
curl "https://ngo-api.YOUR_SUBDOMAIN.workers.dev/api/policies?page=1&limit=20"
```

### Test Frontend

1. Open your Pages URL in a browser
2. Test search functionality
3. Test organization detail pages
4. Verify images load through the proxy
5. Test pagination and filters

## API Documentation

### Endpoints

#### `GET /api/health`
Health check endpoint with database status.

**Response:**
```json
{
  "ok": true,
  "time": "2024-01-03T12:00:00.000Z",
  "db": "ok"
}
```

#### `GET /api/orgs`
List and search organizations.

**Query Parameters:**
- `q` - Search query (searches name, mission, regions, services)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `country` - Filter by country
- `sector` - Filter by sector

**Response:**
```json
{
  "results": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

#### `GET /api/orgs/:id`
Get organization details by ID.

**Response:**
```json
{
  "id": 1,
  "org_name": "Organization Name",
  "founded_date": "2010",
  "overseas_regions": "Africa, Asia",
  ...
}
```

#### `GET /api/orgs/facets`
Get available filters (countries and sectors).

**Response:**
```json
{
  "countries": ["China", "Kenya", ...],
  "sectors": ["Education", "Healthcare", ...]
}
```

#### `GET /api/policies`
List and search policies.

**Query Parameters:**
- `q` - Search query
- `page` - Page number
- `limit` - Results per page

## Troubleshooting

### Database Connection Issues

If you see "db: unavailable" in health check:

1. Verify D1 database exists:
   ```bash
   wrangler d1 list
   ```

2. Check `wrangler.toml` has correct database_id

3. Ensure schema is applied:
   ```bash
   wrangler d1 execute DB_NAME --file=d1/schema.sql
   ```

### Import Script Errors

**Error: "Please set D1_DB_NAME env var"**
```bash
export D1_DB_NAME=ngo_going_out_dev
```

**Error: "Provide a CSV file path"**
```bash
node tools/import_orgs.js path/to/your/file.csv
```

**CSV parsing errors:**
- Ensure CSV uses UTF-8 encoding
- Check that all required column headers are present
- Verify no extra commas or malformed rows

### CORS Issues

If frontend can't connect to API:

1. Check `CORS_ENABLED` is `true` in `worker/src/index.js`
2. Verify API URL is correct in frontend code
3. Check browser console for specific CORS errors

### Deployment Issues

**Worker deployment fails:**
```bash
# Check wrangler is logged in
wrangler whoami

# Re-authenticate if needed
wrangler login
```

**Pages deployment fails:**
```bash
# Ensure you're in the project root
wrangler pages deploy web --project-name=ngo-going-out
```

## Maintenance

### Updating Data

To update organization or policy data:

1. Export updated CSV from your data source
2. Run import script (it uses UPSERT, so existing records are updated):
   ```bash
   export D1_DB_NAME=ngo_going_out
   node tools/import_orgs.js updated_orgs.csv
   ```

### Database Backups

Export your D1 database:

```bash
# Export to SQL
wrangler d1 export ngo_going_out --output=backup.sql

# Or query specific tables
wrangler d1 execute ngo_going_out --command="SELECT * FROM orgs" --json > orgs_backup.json
```

### Monitoring

1. **Cloudflare Dashboard**: Monitor Worker requests, errors, and performance
2. **D1 Analytics**: View database query performance
3. **Pages Analytics**: Track frontend traffic

## Environment Variables Summary

### Worker (wrangler.toml)
- `ENV`: "development" or "production"
- `DEBUG_ENABLED`: "true" or "false"

### Pages (Cloudflare Dashboard)
- `API_BASE_URL`: Worker API URL
- `IMAGE_PROXY_URL`: Image proxy Worker URL

### Local Development (Shell)
- `D1_DB_NAME`: Database name for import scripts

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloudflare documentation
3. Check Wrangler logs: `wrangler tail` (for live Worker logs)

