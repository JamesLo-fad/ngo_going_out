// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: ["/api/*"],
  exclude: []
};

// ../.nvm/versions/node/v24.4.1/lib/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "/Users/jameslo-aa/ngo_going_out/.wrangler/tmp/pages-CK1ra9/functionsWorker-0.48017531637523936.mjs";
import { isRoutingRuleMatch } from "/Users/jameslo-aa/.nvm/versions/node/v24.4.1/lib/node_modules/wrangler/templates/pages-dev-util.ts";
export * from "/Users/jameslo-aa/ngo_going_out/.wrangler/tmp/pages-CK1ra9/functionsWorker-0.48017531637523936.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=e5oqupuq3qs.js.map
