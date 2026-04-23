import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";

const dbPath = path.join(__dirname, "../../receipts.db");

export const db: DatabaseType = new Database(dbPath);

// WAL mode is excellent for performance in concurrent environments
db.pragma("journal_mode = WAL");

/**
 * We use a transaction to ensure both tables are created together.
 * I've added a separate line_items table to demonstrate proper 
 */
const createTables = db.transaction(() => {
  // Main receipt record
  db.prepare(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      merchant TEXT,
      date TEXT,
      total REAL,
      raw_data TEXT NOT NULL, -- The original LLM JSON stringified
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id TEXT,
      name TEXT,
      amount REAL,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    )
  `).run();
});

createTables();