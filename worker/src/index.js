// worker/src/index.js

// Toggle CORS for local dev (5500 -> 8787). Turn off in production if you don't need cross-origin.
const CORS_ENABLED = true;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // 1) CORS preflight handler (must run before routes)
    if (method === "OPTIONS" && CORS_ENABLED) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    try {
      // 2) Health
      if (pathname === "/api/health" && method === "GET") {
        return json({ ok: true, time: new Date().toISOString() });
      }

      // 3) Orgs list
      if (pathname === "/api/orgs" && method === "GET") {
        return await listOrgs(env, url);
      }

      // 4) Org detail
      const orgDetailMatch = pathname.match(/^\/api\/orgs\/(\d+)$/);
      if (orgDetailMatch && method === "GET") {
        const id = parseInt(orgDetailMatch[1], 10);
        return await getOrgDetail(env, id);
      }

      // 5) Policies list
      if (pathname === "/api/policies" && method === "GET") {
        return await listPolicies(env, url);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      // Minimal logging in dev
      if (env?.ENV !== "production") {
        console.error("API error:", err);
      }
      return json({ error: "Internal Server Error" }, 500);
    }
  },
};

// ---------- Handlers ----------

async function listOrgs(env, url) {
  const q = (url.searchParams.get("query") || "").trim();
  const page = clampInt(url.searchParams.get("page"), 1, 1_000_000, 1);
  const pageSize = clampInt(url.searchParams.get("page_size"), 5, 50, 20);
  const offset = (page - 1) * pageSize;

  let where = "";
  const params = [];
  if (q) {
    // LIKE with parameter binding
    where = "WHERE org_name LIKE ? OR overseas_regions LIKE ? OR overseas_services LIKE ?";
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const totalSql = `SELECT COUNT(*) AS c FROM orgs ${where}`;
  const totalRes = await env.DB.prepare(totalSql).bind(...params).all();
  const total = Number(totalRes.results?.[0]?.c || 0);

  const listSql = `
    SELECT id, org_name, service_mode, go_out_level, overseas_regions, logo_url
    FROM orgs
    ${where}
    ORDER BY org_name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
  `;
  const listRes = await env.DB.prepare(listSql).bind(...params, pageSize, offset).all();
  const items = listRes.results || [];

  return json({ items, total, page, page_size: pageSize });
}

async function getOrgDetail(env, id) {
  if (!Number.isInteger(id)) return json({ error: "Invalid id" }, 400);
  const sql = `
    SELECT id, org_name, in_cnie, in_cace, in_un,
           founded_date, go_global_date, leaders, key_staff,
           capital_type, reg_location, reg_type,
           donation_pre, donation_pre_year, donation_post,
           mission, org_structure,
           has_overseas_office, overseas_mission, overseas_projects,
           overseas_regions, overseas_services, service_mode,
           has_official_background, sources, disclosed_online, disclosed_continuous,
           go_out_level, logo_url
    FROM orgs
    WHERE id = ?
  `;
  const res = await env.DB.prepare(sql).bind(id).all();
  const row = res.results?.[0];
  if (!row) return json({ error: "Not found" }, 404);
  return json(row);
}

async function listPolicies(env, url) {
  const issuer = (url.searchParams.get("issuer") || "").trim();
  const year = (url.searchParams.get("year") || "").trim(); // substring match in published_date

  let where = "WHERE 1=1";
  const params = [];

  if (issuer) {
    where += " AND (issuer_1 LIKE ? OR issuer_2 LIKE ? OR issuer_3 LIKE ? OR issuer_4 LIKE ?)";
    const like = `%${issuer}%`;
    params.push(like, like, like, like);
  }
  if (year) {
    where += " AND published_date LIKE ?";
    params.push(`%${year}%`);
  }

  const sql = `
    SELECT id, published_date, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4, link
    FROM policies
    ${where}
    ORDER BY CAST(id AS INT)
  `;
  const res = await env.DB.prepare(sql).bind(...params).all();
  return json({ items: res.results || [] });
}

// ---------- Utilities ----------

function json(data, status = 200) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (CORS_ENABLED) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}