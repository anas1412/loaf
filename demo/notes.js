import { db } from "../db.js";

db.run(`CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

const page = Bun.file(`${import.meta.dir}/index.html`);

export default {
  "/demo": () => new Response(page),

  "/api/notes": {
    GET: () => Response.json(db.query("SELECT * FROM notes ORDER BY id DESC").all()),

    POST: async (req) => {
      const body = await req.json().catch(() => null);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 500) {
        return Response.json({ error: "text must be 1-500 characters" }, { status: 400 });
      }
      const note = db.query("INSERT INTO notes (text) VALUES (?) RETURNING *").get(text);
      return Response.json(note, { status: 201 });
    },
  },

  "/api/notes/:id": {
    DELETE: (req) => {
      const { changes } = db.query("DELETE FROM notes WHERE id = ?").run(req.params.id);
      return new Response(null, { status: changes ? 204 : 404 });
    },
  },
};
