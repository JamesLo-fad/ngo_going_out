// Direct D1 database access - bypassing Worker
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Health check
    if (url.pathname === '/api/health') {
      const result = await env.database.prepare('SELECT COUNT(*) as count FROM orgs').first();
      return new Response(JSON.stringify({
        ok: true,
        time: new Date().toISOString(),
        db: 'ok',
        count: result.count
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // List orgs
    if (url.pathname === '/api/orgs') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '20');
      const query = url.searchParams.get('query') || '';
      const offset = (page - 1) * pageSize;

      let sql = 'SELECT * FROM orgs';
      let countSql = 'SELECT COUNT(*) as total FROM orgs';
      const params = [];

      if (query) {
        const searchPattern = `%${query}%`;
        sql += ' WHERE org_name LIKE ? OR overseas_regions LIKE ?';
        countSql += ' WHERE org_name LIKE ? OR overseas_regions LIKE ?';
        params.push(searchPattern, searchPattern);
      }

      sql += ' LIMIT ? OFFSET ?';
      const queryParams = [...params, pageSize, offset];
      const countParams = [...params];

      const [items, total] = await Promise.all([
        env.database.prepare(sql).bind(...queryParams).all(),
        env.database.prepare(countSql).bind(...countParams).first()
      ]);

      return new Response(JSON.stringify({
        items: items.results || [],
        total: total.total || 0,
        page,
        page_size: pageSize
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // List policies
    if (url.pathname === '/api/policies') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '20');
      const query = url.searchParams.get('query') || '';
      const offset = (page - 1) * pageSize;

      let sql = 'SELECT * FROM policies';
      let countSql = 'SELECT COUNT(*) as total FROM policies';
      const params = [];

      if (query) {
        const searchPattern = `%${query}%`;
        sql += ' WHERE title LIKE ? OR agency1 LIKE ? OR agency2 LIKE ? OR agency3 LIKE ? OR agency4 LIKE ?';
        countSql += ' WHERE title LIKE ? OR agency1 LIKE ? OR agency2 LIKE ? OR agency3 LIKE ? OR agency4 LIKE ?';
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      sql += ' ORDER BY publish_date DESC LIMIT ? OFFSET ?';
      const queryParams = [...params, pageSize, offset];
      const countParams = [...params];

      const [items, total] = await Promise.all([
        env.database.prepare(sql).bind(...queryParams).all(),
        env.database.prepare(countSql).bind(...countParams).first()
      ]);

      return new Response(JSON.stringify({
        items: items.results || [],
        total: total.total || 0,
        page,
        page_size: pageSize
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get org detail
    const orgMatch = url.pathname.match(/^\/api\/orgs\/(\d+)$/);
    if (orgMatch) {
      const id = parseInt(orgMatch[1]);
      const org = await env.database.prepare('SELECT * FROM orgs WHERE id = ?').bind(id).first();

      if (!org) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify(org), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Not found
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
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
