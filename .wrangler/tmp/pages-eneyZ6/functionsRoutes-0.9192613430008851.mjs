import { onRequestGet as __api__archived_facets_orgs_js_onRequestGet } from "/Users/jameslo-aa/ngo_going_out/functions/api/_archived/facets_orgs.js"
import { onRequestGet as __api__archived_search_orgs_js_onRequestGet } from "/Users/jameslo-aa/ngo_going_out/functions/api/_archived/search_orgs.js"
import { onRequestGet as __api__archived_search_policies_js_onRequestGet } from "/Users/jameslo-aa/ngo_going_out/functions/api/_archived/search_policies.js"

export const routes = [
    {
      routePath: "/api/_archived/facets_orgs",
      mountPath: "/api/_archived",
      method: "GET",
      middlewares: [],
      modules: [__api__archived_facets_orgs_js_onRequestGet],
    },
  {
      routePath: "/api/_archived/search_orgs",
      mountPath: "/api/_archived",
      method: "GET",
      middlewares: [],
      modules: [__api__archived_search_orgs_js_onRequestGet],
    },
  {
      routePath: "/api/_archived/search_policies",
      mountPath: "/api/_archived",
      method: "GET",
      middlewares: [],
      modules: [__api__archived_search_policies_js_onRequestGet],
    },
  ]