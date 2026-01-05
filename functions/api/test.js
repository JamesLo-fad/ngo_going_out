// Diagnostic endpoint to check what's available
export async function onRequest(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const diagnostics = {
      ok: true,
      message: "Functions are working!",
      timestamp: new Date().toISOString(),
      env_available: !!env,
      bindings: {
        database: !!env?.database,
        DB: !!env?.DB,
        d1: !!env?.d1,
      },
      env_keys: env ? Object.keys(env) : []
    };

    // Try to query database if available
    if (env?.database) {
      try {
        const result = await env.database.prepare('SELECT COUNT(*) as count FROM orgs').first();
        diagnostics.database_test = { success: true, count: result.count };
      } catch (dbError) {
        diagnostics.database_test = { success: false, error: dbError.message };
      }
    }

    return new Response(JSON.stringify(diagnostics, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
