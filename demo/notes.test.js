import { test, expect } from "bun:test";

process.env.DB = ":memory:";
process.env.PORT = "0";
const { server } = await import("../server.js");
const api = new URL("/api/notes", server.url);

test("create, list and delete a note", async () => {
  const res = await fetch(api, { method: "POST", body: JSON.stringify({ text: "hello" }) });
  expect(res.status).toBe(201);
  const note = await res.json();
  expect(note.text).toBe("hello");

  expect(await (await fetch(api)).json()).toEqual([note]);
  expect((await fetch(`${api}/${note.id}`, { method: "DELETE" })).status).toBe(204);
  expect(await (await fetch(api)).json()).toEqual([]);
});

test("rejects empty text and bad JSON", async () => {
  expect((await fetch(api, { method: "POST", body: JSON.stringify({ text: " " }) })).status).toBe(400);
  expect((await fetch(api, { method: "POST", body: "nope" })).status).toBe(400);
});
