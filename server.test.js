import { test, expect, afterAll } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Pages used by the layout tests, removed when the tests finish.
const FIXTURES = join(import.meta.dir, "public", "loaf-test-fixtures");
mkdirSync(join(FIXTURES, "inner"), { recursive: true });
mkdirSync(join(FIXTURES, "old"), { recursive: true });
const fixture = (name, html) => writeFileSync(join(FIXTURES, name), html);
fixture("_layout.html", `<html><head><title>Layout</title></head><body><!-- <slot></slot> <include src="loaf-test-fixtures/_logo.html"></include> --><include src="loaf-test-fixtures/_nav.html"></include><slot></slot></body></html>`);
fixture("_nav.html", `<nav><loaf-include src="loaf-test-fixtures/_logo.html"></loaf-include></nav>`);
fixture("_logo.html", `<b>LOGO</b>`);
fixture("page.html", `<head><title>Page</title><meta name="x" content="1"></head>\n<p>Hello</p>`);
fixture("untitled.html", `<p>No title</p><svg><title>icon</title></svg>`);
fixture("full.html", `<!doctype html><html><head><title>Full</title></head><body><include src="loaf-test-fixtures/_logo.html"></include></body></html>`);
fixture("loop.html", `<include src="loaf-test-fixtures/_loop.html"></include>`);
fixture("_loop.html", `<include src="loaf-test-fixtures/_loop.html"></include>`);
fixture("missing.html", `<include src="loaf-test-fixtures/_nope.html"></include>`);
fixture("inner/_layout.html", `<html><head><title>Inner</title></head><body><main><loaf-page></loaf-page></main></body></html>`);
fixture("old/_layout.html", `<html><head><title>Old</title></head><body><slot /></body></html>`);
fixture("old/page.html", `<include src="loaf-test-fixtures/_logo.html" />`);
fixture("inner/page.html", `<p>Inside</p>`);
afterAll(() => rmSync(FIXTURES, { recursive: true, force: true }));

process.env.DB = ":memory:";
process.env.PORT = "0";
const { server, loadApiRoutes } = await import("./server.js");
const url = (path) => new URL(path, server.url);
const text = async (path) => (await fetch(url(path))).text();
const send = (method, path, body, headers = {}) =>
  fetch(url(path), {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// fetch() normalizes "..", so send the raw request line like an attacker would.
const rawStatus = (path) =>
  new Promise((resolve) => {
    let data = "";
    const socket = connect(server.port, "127.0.0.1", () =>
      socket.write(`GET ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`),
    );
    socket.on("data", (chunk) => (data += chunk));
    socket.on("end", () => resolve(Number(data.split(" ")[1])));
  });

test("serves pages from public/ with clean URLs", async () => {
  expect((await fetch(url("/"))).status).toBe(200);
  expect(await text("/demo")).toContain('<loaf-list name="todos">');
  expect((await fetch(url("/missing"))).status).toBe(404);
});

test("blocks path traversal, private files and null bytes", async () => {
  expect(await rawStatus("/../server.js")).toBe(404);
  expect(await rawStatus("/..%2fserver.js")).toBe(404);
  expect(await rawStatus("/..%2f..%2fetc%2fpasswd")).toBe(404);
  expect((await fetch(url("/_layout.html"))).status).toBe(404);
  expect((await fetch(url("/_header"))).status).toBe(404);
  expect((await fetch(url("/a%00b"))).status).toBe(404);
});

test("answers unchanged files with 304", async () => {
  const first = await fetch(url("/logo.svg"));
  const lastModified = first.headers.get("last-modified");
  expect(lastModified).toBeTruthy();
  const again = await fetch(url("/logo.svg"), { headers: { "If-Modified-Since": lastModified } });
  expect(again.status).toBe(304);
});

test("layouts: wraps fragments, sets the title, nests includes", async () => {
  const page = await text("/loaf-test-fixtures/page");
  expect(page).toContain("<title>Page</title>");
  expect(page).not.toContain("<title>Layout</title>");
  expect(page).toContain(`<meta name="x" content="1"></head>`);
  expect(page).toContain(`<body><!-- <slot></slot> <include src="loaf-test-fixtures/_logo.html"></include> --><nav><b>LOGO</b></nav>\n<p>Hello</p></body>`);

  const untitled = await text("/loaf-test-fixtures/untitled");
  expect(untitled).toContain("<title>Layout</title>");
  expect(untitled).toContain("<svg><title>icon</title></svg>");

  const full = await text("/loaf-test-fixtures/full");
  expect(full).toContain("<title>Full</title><");
  expect(full).not.toContain("<nav>");
  expect(full).toContain("<b>LOGO</b>");

  expect(await text("/loaf-test-fixtures/inner/page")).toContain("<title>Inner</title></head><body><main><p>Inside</p></main>");
  expect(await text("/loaf-test-fixtures/old/page")).toContain("<body><b>LOGO</b></body>");
  expect(await text("/loaf-test-fixtures/missing")).toContain("<!-- include not found");
  expect((await fetch(url("/loaf-test-fixtures/loop"))).status).toBe(500);
});

test("turns api/ files into routes that win over the data API", async () => {
  expect(await (await fetch(url("/api/hello"))).json()).toEqual({ message: "Hello from api/hello.js" });
});

test("api/ files: skips empty files and _helpers, supports export default", async () => {
  const dir = mkdtempSync(join(tmpdir(), "loaf-api-"));
  writeFileSync(join(dir, "empty.js"), "// nothing yet\n");
  writeFileSync(join(dir, "_helper.js"), "export const GET = () => new Response('no');\n");
  writeFileSync(join(dir, "any.js"), "export default (req) => new Response(req.method);\n");
  const routes = await loadApiRoutes(dir);
  rmSync(dir, { recursive: true });
  expect(Object.keys(routes)).toEqual(["/api/any"]);
  expect(await (await routes["/api/any"](new Request("http://x/api/any", { method: "PUT" }))).text()).toBe("PUT");
});

test("data API: create, list, get, update and delete", async () => {
  const created = await (await send("POST", "/api/todos", { text: "bake", id: 99 })).json();
  expect(created).toMatchObject({ text: "bake" });
  expect(created.id).not.toBe(99);

  expect(await (await send("GET", "/api/todos")).json()).toEqual([created]);
  expect(await (await send("GET", "/api/other")).json()).toEqual([]);

  const updated = await (await send("PATCH", `/api/todos/${created.id}`, { done: true })).json();
  expect(updated).toMatchObject({ text: "bake", done: true, id: created.id });
  expect(await (await send("GET", `/api/todos/${created.id}`)).json()).toEqual(updated);

  expect((await send("DELETE", `/api/todos/${created.id}`)).status).toBe(204);
  expect((await send("GET", `/api/todos/${created.id}`)).status).toBe(404);
  expect((await send("DELETE", `/api/todos/${created.id}`)).status).toBe(404);
});

test("data API: limit and offset", async () => {
  for (const n of [1, 2, 3]) await send("POST", "/api/pages", { n });
  const numbers = async (query) => (await (await send("GET", `/api/pages${query}`)).json()).map((r) => r.n);
  expect(await numbers("")).toEqual([3, 2, 1]);
  expect(await numbers("?limit=2")).toEqual([3, 2]);
  expect(await numbers("?limit=2&offset=2")).toEqual([1]);
  expect((await send("GET", "/api/pages?limit=abc")).status).toBe(400);
});

test("data API rejects anything but a JSON object", async () => {
  expect((await send("POST", "/api/todos", [1, 2])).status).toBe(400);
  expect((await fetch(url("/api/todos"), { method: "POST", body: "nope" })).status).toBe(400);
});

test("blocks writes from other websites", async () => {
  expect((await send("POST", "/api/csrf", { a: 1 }, { "Sec-Fetch-Site": "cross-site" })).status).toBe(403);
  expect((await send("POST", "/api/csrf", { a: 1 }, { "Sec-Fetch-Site": "same-site" })).status).toBe(403);
  expect((await send("POST", "/api/csrf", { a: 1 }, { Origin: "https://evil.example" })).status).toBe(403);
  expect((await send("POST", "/api/csrf", { a: 1 }, { "Sec-Fetch-Site": "same-origin" })).status).toBe(201);
  expect((await send("POST", "/api/csrf", { a: 1 }, { Origin: server.url.origin })).status).toBe(201);
  expect((await send("POST", "/api/csrf", { a: 1 })).status).toBe(201);
  expect((await send("GET", "/api/csrf", undefined, { "Sec-Fetch-Site": "cross-site" })).status).toBe(200);
});

test("rejects uploads over 1 MB", async () => {
  expect((await send("POST", "/api/big", { text: "x".repeat(2_000_000) })).status).toBe(413);
});
