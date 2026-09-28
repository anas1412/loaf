import { test, expect } from "bun:test";
import { connect } from "node:net";

process.env.DB = ":memory:";
process.env.PORT = "0";
const { server } = await import("./server.js");

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

test("serves public/ files", async () => {
  expect((await fetch(server.url)).status).toBe(200);
  expect((await fetch(new URL("/logo.svg", server.url))).status).toBe(200);
  expect((await fetch(new URL("/missing.png", server.url))).status).toBe(404);
});

test("blocks path traversal", async () => {
  expect(await rawStatus("/../server.js")).toBe(404);
  expect(await rawStatus("/%2e%2e/server.js")).toBe(404);
});
