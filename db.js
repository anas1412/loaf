import { Database } from "bun:sqlite";

export const db = new Database(process.env.DB ?? "loaf.db");
db.run("PRAGMA journal_mode = WAL");
