import { test, expect } from "bun:test";
import { connect } from "node:net";

process.env.DB = ":memory:";
process.env.PORT = "0";
const { server } = await import("./server.js");
const url = (path) => new URL(path, server.url);
const send = (method, path, body) =>
  fetch(url(path), { method, body: body === undefined ? undefined : JSON.stringify(body) });

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
  expect((await fetch(url("/loaf.js"))).status).toBe(200);
  expect(await (await fetch(url("/demo"))).text()).toContain("collection('todos')");
  expect((await fetch(url("/missing"))).status).toBe(404);
});

test("blocks path traversal", async () => {
  expect(await rawStatus("/../server.js")).toBe(404);
  expect(await rawStatus("/..%2fserver.js")).toBe(404);
  expect(await rawStatus("/..%2f..%2fetc%2fpasswd")).toBe(404);
});

test("turns api/ files into routes that win over the data API", async () => {
  expect(await (await fetch(url("/api/hello"))).json()).toEqual({ message: "Hello from api/hello.js" });
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

test("data API rejects anything but a JSON object", async () => {
  expect((await send("POST", "/api/todos", [1, 2])).status).toBe(400);
  expect((await fetch(url("/api/todos"), { method: "POST", body: "nope" })).status).toBe(400);
});
