import { join, sep } from "node:path";
import { db } from "./db.js"; // db
import demo from "./demo/notes.js"; // demo

const PUBLIC = join(import.meta.dir, "public");

export const server = Bun.serve({
  port: process.env.PORT ?? 3000,

  routes: {
    ...demo, // demo
  },

  // Anything not matched above is a file from public/.
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const path = join(PUBLIC, pathname === "/" ? "index.html" : pathname);
    const file = Bun.file(path);
    if (!path.startsWith(PUBLIC + sep) || !(await file.exists())) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(file);
  },

  error(err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Loaf running at ${server.url}`);
