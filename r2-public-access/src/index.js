// R2 Public Access Worker for NGO Logo CDN
// Provides public access to logos stored in R2 bucket

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Get the file path from URL pathname
    // Remove leading slash
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // Get object from R2
      const object = await env.LOGO_BUCKET.get(key);

      if (!object) {
        return new Response('Not Found', { status: 404 });
      }

      // Set appropriate headers
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('cache-control', 'public, max-age=31536000'); // Cache for 1 year
      headers.set('access-control-allow-origin', '*'); // Allow CORS

      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
