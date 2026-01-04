// Catch-all function for /api/* routes
export async function onRequest(context) {
  const { request, env } = context;

  console.log('[API Handler] Request:', request.url);

  // Check if Service Binding is available
  if (!env.API) {
    console.error('[API Handler] Service Binding not available');
    return new Response(JSON.stringify({
      error: 'Service Binding not configured',
      hint: 'Please configure API service binding in Pages settings'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    console.log('[API Handler] Calling Worker via Service Binding');
    const response = await env.API.fetch(request);
    console.log('[API Handler] Worker response:', response.status);
    return response;
  } catch (error) {
    console.error('[API Handler] Error:', error);
    return new Response(JSON.stringify({
      error: 'Service Binding failed',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
