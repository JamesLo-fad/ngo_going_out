// CDN endpoint for R2 logo files
// Provides public access to logos stored in R2 bucket

export async function onRequest(context) {
  const { params, env } = context;

  // Get the file path from URL
  const path = params.path ? params.path.join('/') : '';

  if (!path) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    // Get object from R2
    const object = await env.LOGO_BUCKET.get(path);

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
    console.error('R2 error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
