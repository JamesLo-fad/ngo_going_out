var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/src/index.js
var CORS_ENABLED = true;
function isDebugEnabled(env) {
  return env?.DEBUG_ENABLED === "true" || env?.DEBUG_ENABLED === "1";
}
__name(isDebugEnabled, "isDebugEnabled");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();
    if (method === "OPTIONS" && CORS_ENABLED) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }
    try {
      if (pathname === "/api/health" && method === "GET") {
        const dbOk = await checkDb(env).catch(() => false);
        return json(
          { ok: true, time: (/* @__PURE__ */ new Date()).toISOString(), db: dbOk ? "ok" : "unavailable" },
          dbOk ? 200 : 503
        );
      }
      if (pathname === "/api/orgs" && method === "GET") {
        return await listOrgs(env, url);
      }
      if (pathname === "/api/orgs/facets" && method === "GET") {
        return await getOrgsFacets(env);
      }
      const orgDetailMatch = pathname.match(/^\/api\/orgs\/(\d+)$/);
      if (orgDetailMatch && method === "GET") {
        const id = parseInt(orgDetailMatch[1], 10);
        return await getOrgDetail(env, id);
      }
      if (pathname === "/api/policies" && method === "GET") {
        return await listPolicies(env, url);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      logDebug(env, "API fatal error:", err);
      return json(
        {
          error: "Internal Server Error",
          ...isDebugEnabled(env) ? { detail: String(err?.message || err) } : {}
        },
        500
      );
    }
  }
};
async function listOrgs(env, url) {
  const q = (url.searchParams.get("query") || "").trim();
  const country = (url.searchParams.get("country") || "").trim();
  const sector = (url.searchParams.get("sector") || "").trim();
  const page = clampInt(url.searchParams.get("page"), 1, 1e6, 1);
  const pageSize = clampInt(url.searchParams.get("page_size"), 1, 100, 20);
  const offset = (page - 1) * pageSize;
  let from = "orgs o";
  const where = [];
  const params = [];
  if (q) {
    from = "orgs o JOIN orgs_fts f ON f.rowid = o.id";
    where.push("f.orgs_fts MATCH ?");
    params.push(q.replace(/[\"']/g, " ").trim());
  }
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
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy = q ? "ORDER BY bm25(f) ASC, o.org_name COLLATE NOCASE ASC" : "ORDER BY o.org_name COLLATE NOCASE ASC";
  await assertTableExists(env, "orgs");
  const totalSql = `SELECT COUNT(DISTINCT o.id) AS c FROM ${from} ${whereClause}`;
  const totalRes = await run(env, totalSql, params);
  const total = Number(totalRes.results?.[0]?.c || 0);
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
__name(listOrgs, "listOrgs");
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
__name(getOrgDetail, "getOrgDetail");
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
      countries: (countriesRes.results || []).map((r) => r.country),
      sectors: (sectorsRes.results || []).map((r) => r.sector)
    });
  } catch (e) {
    logDebug(env, "getOrgsFacets error:", e);
    return json({ countries: [], sectors: [] });
  }
}
__name(getOrgsFacets, "getOrgsFacets");
async function listPolicies(env, url) {
  const q = (url.searchParams.get("query") || "").trim();
  const issuer = (url.searchParams.get("issuer") || "").trim();
  const year = (url.searchParams.get("year") || "").trim();
  await assertTableExists(env, "policies").catch(() => {
    return;
  });
  let from = "policies p";
  const where = [];
  const params = [];
  if (q) {
    from = "policies p JOIN policies_fts f ON f.rowid = p.id";
    where.push("f.policies_fts MATCH ?");
    params.push(q.replace(/[\"']/g, " ").trim());
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
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy = q ? "ORDER BY bm25(f) ASC, p.published_date DESC" : "ORDER BY p.published_date DESC";
  const sql = `
    SELECT ${q ? "DISTINCT" : ""} p.id, p.published_date, p.title, p.doc_type, p.issuer_1, p.issuer_2, p.issuer_3, p.issuer_4, p.link
    FROM ${from}
    ${whereClause}
    ${orderBy}
  `;
  const res = await run(env, sql, params).catch((e) => {
    logDebug(env, "listPolicies error:", e);
    return { results: [] };
  });
  return json({ items: res.results || [] });
}
__name(listPolicies, "listPolicies");
async function run(env, sql, params = []) {
  try {
    return await env.DB.prepare(sql).bind(...params).all();
  } catch (e) {
    const msg = String(e?.message || e || "");
    const isNoTable = msg.includes("no such table") || msg.includes("no such view");
    const isNoColumn = msg.includes("no such column");
    const body = {
      error: "Database error",
      ...isDebugEnabled(env) ? { detail: msg, sql, params } : {}
    };
    const status = isNoTable || isNoColumn ? 500 : 500;
    logDebug(env, "D1 error:", msg, { sql, params });
    throw new HttpError(status, body);
  }
}
__name(run, "run");
async function checkDb(env) {
  try {
    const res = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orgs','policies')"
    ).all();
    const names = (res.results || []).map((r) => r.name);
    return names.includes("orgs");
  } catch {
    return false;
  }
}
__name(checkDb, "checkDb");
async function assertTableExists(env, table) {
  const res = await env.DB.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
  ).bind(table).all();
  const ok = Array.isArray(res.results) && res.results.length > 0;
  if (!ok) {
    throw new HttpError(500, {
      error: "Database not initialized",
      ...isDebugEnabled(env) ? {
        detail: `Missing table '${table}'. Execute schema.sql to the production D1 (use --env production --remote).`
      } : {}
    });
  }
}
__name(assertTableExists, "assertTableExists");
function json(data, status = 200, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  };
  if (CORS_ENABLED) {
    Object.assign(headers, corsHeaders());
  }
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
function clampInt(v, min, max, fallback) {
  const n = parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
__name(clampInt, "clampInt");
function logDebug(env, ...args) {
  if (isDebugEnabled(env)) {
    try {
      console.log(...args);
    } catch {
    }
  }
}
__name(logDebug, "logDebug");
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, body) {
    super(typeof body === "string" ? body : body?.error || "Error");
    this.status = status;
    this.body = body;
  }
};
addEventListener?.("unhandledrejection", (e) => {
  try {
    console.log("unhandledrejection:", e?.reason || e);
  } catch {
  }
});

// ../.nvm/versions/node/v24.4.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-64k8xc/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = src_default;

// ../.nvm/versions/node/v24.4.1/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-64k8xc/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
