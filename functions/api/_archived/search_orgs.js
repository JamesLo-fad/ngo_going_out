export const onRequestGet = async ({ env, request }) => {
  try {
    if (env.ALLOW_ORG_SEARCH !== '1') return json({ items: [], total: 0, page: 1, totalPages: 1 });

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const country = (url.searchParams.get('country') || '').trim();
    const sector = (url.searchParams.get('sector') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const defSize = parseInt(env.DEFAULT_PAGE_SIZE || '10', 10);
    const maxSize = parseInt(env.MAX_PAGE_SIZE || '20', 10);
    const pageSize = Math.min(maxSize, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(defSize), 10)));
    const maxPages = parseInt(env.MAX_PAGES || '50', 10);

    if (page > maxPages) {
      return json({ items: [], page, pageSize, total: maxPages * pageSize, totalPages: maxPages });
    }

    const clauses = [];
    const params = [];
    let from = 'orgs o';
    if (q) {
      from = 'orgs o JOIN orgs_fts f ON f.rowid = o.id';
      clauses.push('f.orgs_fts MATCH ?');
      params.push(q.replace(/["']/g, ' '));
    }
    if (country) {
      from += ' LEFT JOIN orgs_facets ofa ON ofa.org_id = o.id';
      clauses.push('ofa.country = ?');
      params.push(country);
    }
    if (sector) {
      if (!from.includes('orgs_facets ofa')) from += ' LEFT JOIN orgs_facets ofa ON ofa.org_id = o.id';
      clauses.push('ofa.sector = ?');
      params.push(sector);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const orderBy = q ? 'ORDER BY bm25(f) ASC, o.name COLLATE NOCASE ASC'
                      : 'ORDER BY o.name COLLATE NOCASE ASC';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(DISTINCT o.id) AS c FROM ${from} ${where};`;
    const dataSql = `
      SELECT DISTINCT
        o.id,
        o.name,
        substr(COALESCE(o.summary,''),1,240) AS summary,
        o.go_out_year,
        o.overseas_office,
        o.project_regions,
        o.services
      FROM ${from}
      ${where}
      ${orderBy}
      LIMIT ? OFFSET ?;
    `;

    const db = env.DB;
    const countRes = await db.prepare(countSql).bind(...params).all();
    const total = (countRes.results?.[0]?.c) || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const dataRes = await db.prepare(dataSql).bind(...params, pageSize, offset).all();
    return json({
      items: dataRes.results || [],
      page, pageSize, total, totalPages: Math.min(totalPages, maxPages)
    }, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}