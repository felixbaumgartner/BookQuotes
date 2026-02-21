import { createClient, type Client } from '@libsql/client';

let db: Client;

export function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

export async function initDb() {
  const client = getDb();

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      goodreads_work_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_image_url TEXT,
      total_quotes INTEGER DEFAULT 0,
      scraped_at TEXT NOT NULL,
      UNIQUE(user_id, goodreads_work_id)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      quote_text TEXT NOT NULL,
      author TEXT NOT NULL,
      likes_count INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      page_number INTEGER DEFAULT 1,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_book_id ON quotes(book_id);
    CREATE INDEX IF NOT EXISTS idx_books_user_work ON books(user_id, goodreads_work_id);
    CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id);
  `);
}

// Helper functions that wrap @libsql/client for convenience

export async function dbAll(sql: string, args: unknown[] = []) {
  const result = await getDb().execute({ sql, args: args as any[] });
  return result.rows;
}

export async function dbGet(sql: string, args: unknown[] = []) {
  const result = await getDb().execute({ sql, args: args as any[] });
  return result.rows[0] || undefined;
}

export async function dbRun(sql: string, args: unknown[] = []) {
  const result = await getDb().execute({ sql, args: args as any[] });
  return {
    changes: result.rowsAffected,
    lastInsertRowid: Number(result.lastInsertRowid || 0),
  };
}
