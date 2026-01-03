// worker/src/index.js

// 是否启用 CORS（Pages 与 Worker 跨域时需要开启）
const CORS_ENABLED = true;

// 生产环境建议关闭调试信息；在开发/预发可打开
// Set via environment variable: DEBUG_ENABLED
function isDebugEnabled(env) {
  return env?.DEBUG_ENABLED === 'true' || env?.DEBUG_ENABLED === '1';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // 1) 处理 CORS 预检
    if (method === "OPTIONS" && CORS_ENABLED) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    try {
      // 2) 健康检查（包含数据库检测）
      if (pathname === "/api/health" && method === "GET") {
        const dbOk = await checkDb(env).catch(() => false);
        return json(
          { ok: true, time: new Date().toISOString(), db: dbOk ? "ok" : "unavailable" },
          dbOk ? 200 : 503
        );
      }

      // 3) 组织列表
      if (pathname === "/api/orgs" && method === "GET") {
        return await listOrgs(env, url);
      }

      // 3.5) 组织facets（国家/行业筛选）
      if (pathname === "/api/orgs/facets" && method === "GET") {
        return await getOrgsFacets(env);
      }

      // 4) 组织详情
      const orgDetailMatch = pathname.match(/^\/api\/orgs\/(\d+)$/);
      if (orgDetailMatch && method === "GET") {
        const id = parseInt(orgDetailMatch[1], 10);
        return await getOrgDetail(env, id);
      }

      // 5) 政策列表
      if (pathname === "/api/policies" && method === "GET") {
        return await listPolicies(env, url);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      // 这里捕获到的多为代码级异常（而非 SQL 级）
      logDebug(env, "API fatal error:", err);
      return json(
        {
          error: "Internal Server Error",
          ...(isDebugEnabled(env) ? { detail: String(err?.message || err) } : {}),
        },
        500
      );
    }
  },
};

// ---------- Handlers ----------

async function listOrgs(env, url) {
  const q = (url.searchParams.get("query") || "").trim();
  const country = (url.searchParams.get("country") || "").trim();
  const sector = (url.searchParams.get("sector") || "").trim();
  const page = clampInt(url.searchParams.get("page"), 1, 1_000_000, 1);
  const pageSize = clampInt(url.searchParams.get("page_size"), 1, 100, 20);
  const offset = (page - 1) * pageSize;

  let from = "orgs o";
  const where = [];
  const params = [];

  // Use FTS for text search
  if (q) {
    from = "orgs o JOIN orgs_fts f ON f.rowid = o.id";
    where.push("f.orgs_fts MATCH ?");
    // Sanitize query for FTS5
    params.push(q.replace(/[\"']/g, ' ').trim());
  }

  // Add facet filtering
  if (country || sector) {
    from += " LEFT JOIN orgs_facets ofa ON ofa.org_id = o.id";
    if (country) {
      where.push("ofa.country = ?");
      params.push(country);
    }
    if (sector) {
      where.push("ofa.sector = ?");
      params.push(sector);
    }
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : "";
  const orderBy = q
    ? "ORDER BY bm25(f) ASC, o.org_name COLLATE NOCASE ASC"
    : "ORDER BY o.org_name COLLATE NOCASE ASC";

  // Ensure table exists
  await assertTableExists(env, "orgs");

  // Count total
  const totalSql = `SELECT COUNT(DISTINCT o.id) AS c FROM ${from} ${whereClause}`;
  const totalRes = await run(env, totalSql, params);
  const total = Number(totalRes.results?.[0]?.c || 0);

  // Get list
  const listSql = `
    SELECT DISTINCT o.id, o.org_name, o.service_mode, o.go_out_level, o.overseas_regions, o.logo_url
    FROM ${from}
    ${whereClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const listRes = await run(env, listSql, [...params, pageSize, offset]);
  const items = listRes.results || [];

  return json({ items, total, page, page_size: pageSize });
}

async function getOrgDetail(env, id) {
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid id" }, 400);

  await assertTableExists(env, "orgs");

  const sql = `
    SELECT id, org_name, in_cnie, in_cace, in_un,
           founded_date, go_global_date, leaders, key_staff,
           capital_type, reg_location, reg_type,
           donation_pre, donation_pre_year, donation_post, donation_post_year,
           mission, org_structure,
           has_overseas_office, overseas_mission, overseas_projects,
           overseas_regions, overseas_services, service_mode,
           has_official_background, sources, disclosed_online, disclosed_continuous,
           go_out_level, logo_url
    FROM orgs
    WHERE id = ?
  `;
  const res = await run(env, sql, [id]);
  const row = res.results?.[0];
  if (!row) return json({ error: "Not found" }, 404);
  return json(row);
}

async function getOrgsFacets(env) {
  try {
    await assertTableExists(env, "orgs_facets");

    const countriesSql = `
      SELECT country, COUNT(DISTINCT org_id) AS cnt
      FROM orgs_facets
      WHERE country IS NOT NULL AND TRIM(country) <> ''
      GROUP BY country
      ORDER BY cnt DESC, country COLLATE NOCASE ASC
      LIMIT 200
    `;
    const countriesRes = await run(env, countriesSql, []);

    const sectorsSql = `
      SELECT sector, COUNT(DISTINCT org_id) AS cnt
      FROM orgs_facets
      WHERE sector IS NOT NULL AND TRIM(sector) <> ''
      GROUP BY sector
      ORDER BY cnt DESC, sector COLLATE NOCASE ASC
      LIMIT 200
    `;
    const sectorsRes = await run(env, sectorsSql, []);

    return json({
      countries: (countriesRes.results || []).map(r => r.country),
      sectors: (sectorsRes.results || []).map(r => r.sector)
    });
  } catch (e) {
    logDebug(env, "getOrgsFacets error:", e);
    return json({ countries: [], sectors: [] });
  }
}

async function listPolicies(env, url) {
  const q = (url.searchParams.get("query") || "").trim();
  const issuer = (url.searchParams.get("issuer") || "").trim();
  const year = (url.searchParams.get("year") || "").trim();

  await assertTableExists(env, "policies").catch(() => {
    // 没有 policies 表时返回空列表而不是 500（按需调整）
    return;
  });

  let from = "policies p";
  const where = [];
  const params = [];

  // Use FTS for text search
  if (q) {
    from = "policies p JOIN policies_fts f ON f.rowid = p.id";
    where.push("f.policies_fts MATCH ?");
    params.push(q.replace(/[\"']/g, ' ').trim());
  }

  if (issuer) {
    where.push("(p.issuer_1 LIKE ? OR p.issuer_2 LIKE ? OR p.issuer_3 LIKE ? OR p.issuer_4 LIKE ?)");
    const like = `%${issuer}%`;
    params.push(like, like, like, like);
  }
  if (year) {
    where.push("p.published_date LIKE ?");
    params.push(`%${year}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : "";
  const orderBy = q
    ? "ORDER BY bm25(f) ASC, p.published_date DESC"
    : "ORDER BY p.published_date DESC";

  const sql = `
    SELECT ${q ? 'DISTINCT' : ''} p.id, p.published_date, p.title, p.doc_type, p.issuer_1, p.issuer_2, p.issuer_3, p.issuer_4, p.link
    FROM ${from}
    ${whereClause}
    ${orderBy}
  `;
  const res = await run(env, sql, params).catch((e) => {
    // 如果 policies 表不存在或其它错误，返回空列表并携带最小错误信息（DEBUG）
    logDebug(env, "listPolicies error:", e);
    return { results: [] };
  });
  return json({ items: res.results || [] });
}

// ---------- DB helpers ----------

async function run(env, sql, params = []) {
  try {
    return await env.DB.prepare(sql).bind(...params).all();
  } catch (e) {
    // 针对 D1 的典型错误给出更清晰的提示
    const msg = String(e?.message || e || "");
    const isNoTable =
      msg.includes("no such table") || msg.includes("no such view");
    const isNoColumn = msg.includes("no such column");
    const body = {
      error: "Database error",
      ...(isDebugEnabled(env) ? { detail: msg, sql, params } : {}),
    };
    const status = isNoTable || isNoColumn ? 500 : 500; // 统一 500，便于前端兜底
    logDebug(env, "D1 error:", msg, { sql, params });
    throw new HttpError(status, body);
  }
}

async function checkDb(env) {
  try {
    // 轻量探测：查询 sqlite_master 看 orgs 是否存在
    const res = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orgs','policies')"
    ).all();
    const names = (res.results || []).map((r) => r.name);
    return names.includes("orgs"); // 至少 orgs 存在即认为可用
  } catch {
    return false;
  }
}

async function assertTableExists(env, table) {
  const res = await env.DB.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
  )
    .bind(table)
    .all();
  const ok = Array.isArray(res.results) && res.results.length > 0;
  if (!ok) {
    // 抛出错误，由上层捕获并返回 500（提示需要先执行 schema.sql 到 remote）
    throw new HttpError(500, {
      error: "Database not initialized",
      ...(isDebugEnabled(env)
        ? {
            detail: `Missing table '${table}'. Execute schema.sql to the production D1 (use --env production --remote).`,
          }
        : {}),
    });
  }
}

// ---------- Utilities ----------

function json(data, status = 200, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  };
  if (CORS_ENABLED) {
    Object.assign(headers, corsHeaders());
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function logDebug(env, ...args) {
  if (isDebugEnabled(env)) {
    // Cloudflare Workers 的 console 会在 wrangler tail 中显示
    try {
      console.log(...args);
    } catch {}
  }
}

class HttpError extends Error {
  constructor(status, body) {
    super(typeof body === "string" ? body : body?.error || "Error");
    this.status = status;
    this.body = body;
  }
}

// 顶层错误处理中如果捕获到 HttpError，可用如下中间件式封装
addEventListener?.("unhandledrejection", (e) => {
  // 避免未处理的 Promise 拒绝导致 worker 崩溃
  try {
    console.log("unhandledrejection:", e?.reason || e);
  } catch {}
});