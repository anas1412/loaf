import { existsSync, watch } from "node:fs";
import { join } from "node:path";
import { dataRoutes } from "./db.js";
import { servePage } from "./pages.js";

// Loaf's own code lives in loaf/. Your project is the folder around it.
const ROOT = join(import.meta.dir, "..");
const API = join(ROOT, "api");
export const VERSION = (await Bun.file(join(import.meta.dir, "VERSION")).text()).trim();
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Every file in api/ becomes a route: api/hello.js → /api/hello, api/users/[id].js → /api/users/:id
// Files and folders starting with _ are helpers you can import, not routes.
export async function loadApiRoutes(dir = API) {
  const routes = {};
  if (!existsSync(dir)) return routes;
  for (const file of new Bun.Glob("**/*.js").scanSync(dir)) {
    const path = file.replaceAll("\\", "/");
    if (path.split("/").some((part) => part.startsWith("_"))) continue;
    const route = ("/api/" + path).replace(/\.js$/, "").replace(/\/index$/, "").replace(/\[(\w+)\]/g, ":$1");
    const module = await import(`${join(dir, file)}?v=${Date.now()}`);
    const methods = METHODS.filter((method) => typeof module[method] === "function");
    if (methods.length) routes[route] = Object.fromEntries(methods.map((method) => [method, module[method]]));
    else if (typeof module.default === "function") routes[route] = module.default;
    else console.warn(`api/${path} exports no GET, POST, PUT, PATCH, DELETE or default function yet, so ${route} isn't live.`);
  }
  return routes;
}

// Blocks requests that change data when they come from another website (CSRF).
// Browsers label where a request comes from; tools like curl don't, so they're allowed.
function fromThisSite(req) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function guard(handler) {
  return (req, server) =>
    req.method === "GET" || req.method === "HEAD" || fromThisSite(req)
      ? handler(req, server)
      : Response.json({ error: "blocked a request from another website" }, { status: 403 });
}

function guardAll(routes) {
  const guarded = {};
  for (const [path, route] of Object.entries(routes)) {
    guarded[path] =
      typeof route === "function"
        ? guard(route)
        : Object.fromEntries(Object.entries(route).map(([method, handler]) => [method, guard(handler)]));
  }
  return guarded;
}

async function config() {
  return {
    port: process.env.PORT ?? 3000,
    maxRequestBodySize: 1024 * 1024, // 1 MB, bigger uploads get a 413
    routes: guardAll({
      ...(process.env.DATA === "off" ? {} : dataRoutes), // DATA=off turns off the automatic data API
      ...(await loadApiRoutes()), // your api/ files win over the data API
    }),
    fetch: servePage, // everything else: pages and files from public/
    error(err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    },
  };
}

export const server = Bun.serve(await config());
console.log(`Loaf ${VERSION} running at ${server.url}`);

// With `bun dev`, new and deleted api/ files go live without a restart.
// (Edits to existing files already restart the server through bun --watch.)
if (process.argv.includes("--dev") && existsSync(API)) {
  let pending;
  watch(API, { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(async () => {
      try {
        server.reload(await config());
      } catch (err) {
        console.error(err);
      }
    }, 100);
  });
}
