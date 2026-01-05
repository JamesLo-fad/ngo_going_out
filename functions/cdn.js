// CDN endpoint for R2 logo files
// Provides public access to logos stored in R2 bucket
// Handles requests to /cdn and extracts the file path from the URL

export async function onRequest(context) {
  const { env, request } = context;

  // Debug logging
  console.log('=== CDN Request Debug ===');
  console.log('URL:', request.url);
  console.log('Available env keys:', Object.keys(env));
  console.log('LOGO_BUCKET exists:', 'LOGO_BUCKET' in env);

  // Extract file path from URL
  // URL format: https://domain/cdn/org_1.png or https://domain/cdn
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/cdn\/(.+)$/);

  if (!pathMatch || !pathMatch[1]) {
    console.log('Error: No file path provided');
    return new Response('Not Found - No file path specified', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const filePath = pathMatch[1];
  console.log('Requesting file:', filePath);

  // Check if LOGO_BUCKET is available
  if (!env.LOGO_BUCKET) {
    console.error('Error: LOGO_BUCKET binding not found');
    console.error('Available bindings:', Object.keys(env));
    return new Response('R2 bucket not configured', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // Get object from R2
    const object = await env.LOGO_BUCKET.get(filePath);

    if (!object) {
      console.log('Error: File not found in R2:', filePath);
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.log('Success: File found, size:', object.size);

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
    console.error('R2 error:', error.message, error.stack);
    return new Response('Internal Server Error: ' + error.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
