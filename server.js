import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { dataRoutes } from "./db.js"; // db

const PUBLIC = join(import.meta.dir, "public");
const API = join(import.meta.dir, "api");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Every file in api/ becomes a route: api/hello.js → /api/hello, api/users/[id].js → /api/users/:id
const apiRoutes = {};
for (const file of existsSync(API) ? new Bun.Glob("**/*.js").scanSync(API) : []) {
  const route = ("/api/" + file.replaceAll("\\", "/"))
    .replace(/\.js$/, "")
    .replace(/\/index$/, "")
    .replace(/\[(\w+)\]/g, ":$1");
  const module = await import(join(API, file));
  apiRoutes[route] = Object.fromEntries(METHODS.filter((m) => module[m]).map((m) => [m, module[m]]));
}

export const server = Bun.serve({
  port: process.env.PORT ?? 3000,

  routes: {
    ...dataRoutes, // db
    ...apiRoutes, // your api/ files win over the data API
  },

  // Everything else is a page or file from public/: /about serves public/about.html
  async fetch(req) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }
    const path = join(PUBLIC, pathname);
    if (path !== PUBLIC && !path.startsWith(PUBLIC + sep)) {
      return new Response("Not Found", { status: 404 });
    }
    for (const candidate of [path, path + ".html", join(path, "index.html")]) {
      const file = Bun.file(candidate);
      if ((await file.exists()) && (await file.stat()).isFile()) return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  },

  error(err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Loaf running at ${server.url}`);
