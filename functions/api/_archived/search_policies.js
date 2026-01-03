export const onRequestGet = async ({ env, request }) => {
  try {
    if (env.ALLOW_POLICY_SEARCH !== '1') return json({ items: [], total: 0, page: 1, totalPages: 1 });

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const attr = (url.searchParams.get('attr') || '').trim();
    const dept = (url.searchParams.get('dept') || '').trim();
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
    let from = 'policies p';
    if (q) {
      from = 'policies p JOIN policies_fts f ON f.rowid = p.id';
      clauses.push('f.policies_fts MATCH ?');
      params.push(q.replace(/["']/g, ' '));
    }
    if (attr) { clauses.push('p.attr = ?'); params.push(attr); }
    if (dept) {
      clauses.push('(p.dept1 = ? OR p.dept2 = ? OR p.dept3 = ? OR p.dept4 = ?)');
      params.push(dept, dept, dept, dept);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const orderBy = 'ORDER BY p.publish_date DESC';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) AS c FROM ${from} ${where};`;
    const dataSql = `
      SELECT
        p.id, p.no, p.publish_date, p.title, p.attr, p.dept1, p.dept2, p.dept3, p.dept4, p.link
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
    });
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