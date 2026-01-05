// Test endpoint to verify Pages Functions routing
export async function onRequest(context) {
  return new Response('Test endpoint works!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}
