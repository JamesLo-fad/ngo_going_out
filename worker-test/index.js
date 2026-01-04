// Simple test Worker - just returns Hello World
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Simple health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        ok: true,
        message: 'Test Worker is working!',
        time: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Default response
    return new Response('Hello from test Worker!', {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
