// CDN endpoint for R2 logo files
// Provides public access to logos stored in R2 bucket

export async function onRequest(context) {
  const { params, env, request } = context;

  // Debug logging
  console.log('=== CDN Request Debug ===');
  console.log('URL:', request.url);
  console.log('Available env keys:', Object.keys(env));
  console.log('LOGO_BUCKET exists:', 'LOGO_BUCKET' in env);
  console.log('params.path:', params.path);

  // Get the file path from URL
  // params.path is an array, e.g., ["org_1.png"] or ["subfolder", "logo.png"]
  const path = params.path ? params.path.join('/') : '';

  if (!path) {
    console.log('Error: No path provided');
    return new Response('Not Found', { status: 404 });
  }

  console.log('Requesting file:', path);

  // Check if LOGO_BUCKET is available
  if (!env.LOGO_BUCKET) {
    console.error('Error: LOGO_BUCKET binding not found');
    return new Response('R2 bucket not configured', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // Get object from R2
    const object = await env.LOGO_BUCKET.get(path);

    if (!object) {
      console.log('Error: File not found in R2:', path);
      return new Response('Not Found', { status: 404 });
    }

    console.log('Success: File found, size:', object.size);

    // Set appropriate headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');
    headers.set('access-control-allow-origin', '*');

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
