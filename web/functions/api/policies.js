// Policies list endpoint
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
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
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
