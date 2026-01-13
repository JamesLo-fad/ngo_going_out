/**
 * Stats API Endpoint
 * Returns database statistics: total orgs, regions covered, overseas percentage
 * Cached for 1 hour for performance
 */

export async function onRequest(context) {
  const { env, request } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache first
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    let response = await cache.match(cacheKey);

    if (response) {
      console.log('[stats] Cache hit');
      return response;
    }

    console.log('[stats] Cache miss, querying database');

    // Query total organizations
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM orgs'
    ).first();

    const totalOrgs = totalResult?.total || 438;

    // Query organizations with overseas data
    const overseasResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM orgs WHERE overseas_regions IS NOT NULL AND overseas_regions != ?'
    ).bind('——').first();

    const orgsWithOverseas = overseasResult?.count || 331;

    // Calculate percentage
    const overseasPercentage = totalOrgs > 0
      ? Math.round((orgsWithOverseas / totalOrgs) * 1000) / 10
      : 0;

    // Query all overseas_regions for unique count
    const regionsData = await env.DB.prepare(
      'SELECT overseas_regions FROM orgs WHERE overseas_regions IS NOT NULL AND overseas_regions != ?'
    ).bind('——').all();

    // Parse and count unique regions
    const regionsSet = new Set();

    for (const row of regionsData.results || []) {
      const regionsText = row.overseas_regions;
      if (!regionsText) continue;

      // Split by common delimiters (Chinese and English)
      const parts = regionsText.split(/[、，,;；\n]/);

      for (const part of parts) {
        const region = part.trim();
        if (region && region !== '——') {
          regionsSet.add(region);
        }
      }
    }

    const totalRegions = regionsSet.size || 324;

    // Build response
    const stats = {
      total_orgs: totalOrgs,
      total_regions: totalRegions,
      orgs_with_overseas: orgsWithOverseas,
      overseas_percentage: overseasPercentage,
      last_updated: new Date().toISOString()
    };

    response = new Response(JSON.stringify(stats), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        ...corsHeaders
      }
    });

    // Store in cache
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;

  } catch (error) {
    console.error('[stats] Error:', error);

    // Return fallback static data
    const fallbackStats = {
      total_orgs: 438,
      total_regions: 324,
      orgs_with_overseas: 331,
      overseas_percentage: 75.6,
      error: 'Using fallback data'
    };

    return new Response(JSON.stringify(fallbackStats), {
      status: 200, // Return 200 even on error to avoid breaking frontend
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
