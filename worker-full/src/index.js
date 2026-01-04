// Full Worker serving both static files and API
import apiWorker from '../../worker/src/index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // If it's an API request, use the API worker
    if (url.pathname.startsWith('/api/')) {
      return apiWorker.fetch(request, env, ctx);
    }

    // Otherwise, serve static files
    return env.ASSETS.fetch(request);
  }
};
