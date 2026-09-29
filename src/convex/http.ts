import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { handleProxyRequest } from "./proxy/handler";

const http = httpRouter();

auth.addHttpRoutes(http);

/** The in-page web proxy, registered for every method a page can send. */
const proxyHandler = httpAction(async (_ctx, request) =>
  handleProxyRequest(request),
);

http.route({ path: "/proxy", method: "GET", handler: proxyHandler });
http.route({ path: "/proxy", method: "POST", handler: proxyHandler });
http.route({ path: "/proxy", method: "PUT", handler: proxyHandler });
http.route({ path: "/proxy", method: "PATCH", handler: proxyHandler });
http.route({ path: "/proxy", method: "DELETE", handler: proxyHandler });
http.route({ path: "/proxy", method: "OPTIONS", handler: proxyHandler });

export default http;
