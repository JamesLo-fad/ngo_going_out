export const onRequestGet = async ({ env }) => {
  try {
    const db = env.DB;

    const countriesRes = await db.prepare(`
      SELECT country, COUNT(DISTINCT org_id) AS cnt
      FROM orgs_facets
      WHERE country IS NOT NULL AND TRIM(country) <> ''
      GROUP BY country
      ORDER BY cnt DESC, country COLLATE NOCASE ASC
      LIMIT 200;
    `).all();

    const sectorsRes = await db.prepare(`
      SELECT sector, COUNT(DISTINCT org_id) AS cnt
      FROM orgs_facets
      WHERE sector IS NOT NULL AND TRIM(sector) <> ''
      GROUP BY sector
      ORDER BY cnt DESC, sector COLLATE NOCASE ASC
      LIMIT 200;
    `).all();

    return resp({ countries: (countriesRes.results || []).map(r => r.country),
                  sectors: (sectorsRes.results || []).map(r => r.sector) });
  } catch (e) {
    return resp({ countries: [], sectors: [] });
  }
};

function resp(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}