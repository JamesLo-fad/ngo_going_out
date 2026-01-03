// Image Proxy Worker for NGO Directory
// Proxies images from Google Drive and other sources with CORS support

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Get the target image URL from query parameter
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return jsonResponse({ error: 'Missing url parameter' }, 400);
    }

    try {
      // Convert Google Drive URLs to direct download format
      const directUrl = convertGoogleDriveUrl(targetUrl);

      // Fetch the image
      const imageResponse = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
        },
        cf: {
          cacheTtl: 86400, // Cache for 24 hours
          cacheEverything: true,
        }
      });

      if (!imageResponse.ok) {
        return jsonResponse({ error: 'Failed to fetch image' }, imageResponse.status);
      }

      // Return the image with CORS headers
      const headers = new Headers(imageResponse.headers);
      Object.entries(corsHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // Add caching headers
      headers.set('Cache-Control', 'public, max-age=86400');

      return new Response(imageResponse.body, {
        status: imageResponse.status,
        headers
      });

    } catch (error) {
      return jsonResponse({ error: 'Internal server error', detail: error.message }, 500);
    }
  }
};

function convertGoogleDriveUrl(url) {
  // Convert Google Drive sharing URLs to direct download URLs
  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  // Format 2: https://drive.google.com/open?id=FILE_ID
  // Target: https://drive.google.com/uc?export=view&id=FILE_ID

  const fileIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);

  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
  }

  // Return original URL if not a Google Drive URL
  return url;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}
