# API Endpoints Documentation

**Last Updated**: 2026-01-05
**Base URL**: `https://ngo-going-out.pages.dev`
**Technology**: Cloudflare Pages Functions

## Overview

All API endpoints are implemented as Cloudflare Pages Functions in the `web/functions/api/` directory. They provide RESTful access to the NGO and policy data stored in Cloudflare D1 database.

## Endpoints

### GET `/api/test`

**Purpose**: Diagnostic endpoint to verify API and database connectivity

**Response**:
```json
{
  "ok": true,
  "message": "Functions are working!",
  "timestamp": "2026-01-05T10:00:00.000Z",
  "env_available": true,
  "bindings": {
    "database": true
  },
  "database_test": {
    "success": true,
    "count": 439
  }
}
```

**File**: `web/functions/api/test.js`

---

### GET `/api/orgs`

**Purpose**: List organizations with pagination and search

**Parameters**:
- `page` (integer, default: 1) - Page number
- `page_size` (integer, default: 20) - Items per page
- `query` (string, optional) - Search term (searches org_name and overseas_regions)

**Example Request**:
```
GET /api/orgs?page=1&page_size=10&query=非洲
```

**Response**:
```json
{
  "items": [
    {
      "id": 1,
      "org_name": "中国扶贫基金会",
      "overseas_regions": "非洲、亚洲",
      "overseas_services": "扶贫、教育",
      ...
    }
  ],
  "total": 439,
  "page": 1,
  "page_size": 10
}
```

**File**: `web/functions/api/orgs/index.js`

---

### GET `/api/orgs/:id`

**Purpose**: Get single organization by ID

**Parameters**:
- `id` (integer, required) - Organization ID

**Example Request**:
```
GET /api/orgs/1
```

**Response**:
```json
{
  "id": 1,
  "org_name": "中国扶贫基金会",
  "in_cnie": 1,
  "in_cace": 0,
  "founded_date": "1989",
  "overseas_regions": "非洲、亚洲",
  ...
}
```

**Error Response** (404):
```json
{
  "error": "Not found"
}
```

**File**: `web/functions/api/orgs/[id].js`

---

### GET `/api/policies`

**Purpose**: List policies with pagination and search

**Parameters**:
- `page` (integer, default: 1) - Page number
- `page_size` (integer, default: 20) - Items per page
- `query` (string, optional) - Search term (searches title and all issuer fields)

**Example Request**:
```
GET /api/policies?page=1&page_size=5&query=国务院
```

**Response**:
```json
{
  "items": [
    {
      "id": 1,
      "published_date": "1988-04-05",
      "title": "《国务院关于参加一九八八年国际体育援助计划活动的批复》",
      "doc_type": "批复公示",
      "issuer_1": "国务院",
      "issuer_2": null,
      "issuer_3": null,
      "issuer_4": null,
      "link": "https://www.gov.cn/..."
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 5
}
```

**File**: `web/functions/api/policies.js`

## Common Features

### CORS Headers

All endpoints include CORS headers to allow cross-origin requests:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Internal server error",
  "message": "Detailed error message",
  "stack": "Error stack trace (in development)"
}
```

### Database Binding

All endpoints access the database through the `env.database` binding:

```javascript
export async function onRequest(context) {
  const { env } = context;
  const result = await env.database.prepare('SELECT * FROM orgs').all();
}
```

## Implementation Details

### Search Implementation

Search uses SQL LIKE queries:

```javascript
if (query) {
  const searchPattern = `%${query}%`;
  sql += ' WHERE org_name LIKE ? OR overseas_regions LIKE ?';
  params.push(searchPattern, searchPattern);
}
```

**Note**: This is case-sensitive. Consider using FTS5 for better search.

### Pagination

Standard offset-based pagination:

```javascript
const offset = (page - 1) * pageSize;
sql += ' LIMIT ? OFFSET ?';
params.push(pageSize, offset);
```

### SQL Injection Prevention

All queries use parameterized statements:

```javascript
// ✅ Safe
await env.database.prepare('SELECT * FROM orgs WHERE id = ?').bind(id).all();

// ❌ Unsafe (never do this)
await env.database.prepare(`SELECT * FROM orgs WHERE id = ${id}`).all();
```

## Testing

### Using curl

```bash
# Test endpoint
curl https://ngo-going-out.pages.dev/api/test

# List orgs
curl "https://ngo-going-out.pages.dev/api/orgs?page=1&page_size=5"

# Search orgs
curl "https://ngo-going-out.pages.dev/api/orgs?query=非洲"

# Get single org
curl https://ngo-going-out.pages.dev/api/orgs/1

# List policies
curl https://ngo-going-out.pages.dev/api/policies
```

### Using Browser

Visit URLs directly:
- https://ngo-going-out.pages.dev/api/test
- https://ngo-going-out.pages.dev/api/orgs
- https://ngo-going-out.pages.dev/api/policies

## Related Documentation

- **Database Schema**: `.claude/technical-notes/database-schema.md`
- **Deployment Process**: `.claude/technical-notes/deployment-process.md`

---

**Maintained By**: Claude Code + Development Team
