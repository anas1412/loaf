import { Database } from "bun:sqlite";
import { join } from "node:path";

// loaf.db sits in your project folder, next to public/.
export const db = new Database(process.env.DB ?? join(import.meta.dir, "..", "loaf.db"));
db.run("PRAGMA journal_mode = WAL");

// The automatic data API: /api/<name> works for any name, no setup needed.
// Every record is a JSON object stored in one table.
db.run(`CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY,
  collection TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
db.run("CREATE INDEX IF NOT EXISTS records_collection ON records (collection)");

const toRecord = (row) => ({ ...JSON.parse(row.data), id: row.id, created_at: row.created_at });
const notFound = () => Response.json({ error: "record not found" }, { status: 404 });

// Returns the request body if it's a JSON object, without the fields Loaf manages.
async function readObject(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { id, created_at, ...data } = body;
  return data;
}

export const dataRoutes = {
  "/api/:collection": {
    // ?limit=20&offset=40 returns one page of records. Without them, you get everything.
    GET: (req) => {
      const params = new URL(req.url).searchParams;
      const limit = Number(params.get("limit") ?? -1);
      const offset = Number(params.get("offset") ?? 0);
      if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < -1 || offset < 0) {
        return Response.json({ error: "limit and offset must be whole numbers" }, { status: 400 });
      }
      const rows = db
        .query("SELECT * FROM records WHERE collection = ? ORDER BY id DESC LIMIT ? OFFSET ?")
        .all(req.params.collection, limit, offset);
      return Response.json(rows.map(toRecord));
    },

    POST: async (req) => {
      const data = await readObject(req);
      if (!data) return Response.json({ error: "send a JSON object" }, { status: 400 });
      const row = db
        .query("INSERT INTO records (collection, data) VALUES (?, ?) RETURNING *")
        .get(req.params.collection, JSON.stringify(data));
      return Response.json(toRecord(row), { status: 201 });
    },
  },

  "/api/:collection/:id": {
    GET: (req) => {
      const row = db.query("SELECT * FROM records WHERE collection = ? AND id = ?").get(req.params.collection, req.params.id);
      return row ? Response.json(toRecord(row)) : notFound();
    },

    // Merges the sent fields into the record. Send a field as null to remove it.
    PATCH: async (req) => {
      const data = await readObject(req);
      if (!data) return Response.json({ error: "send a JSON object" }, { status: 400 });
      const row = db
        .query("UPDATE records SET data = json_patch(data, ?) WHERE collection = ? AND id = ? RETURNING *")
        .get(JSON.stringify(data), req.params.collection, req.params.id);
      return row ? Response.json(toRecord(row)) : notFound();
    },

    DELETE: (req) => {
      const { changes } = db.query("DELETE FROM records WHERE collection = ? AND id = ?").run(req.params.collection, req.params.id);
      return changes ? new Response(null, { status: 204 }) : notFound();
    },
  },
};
