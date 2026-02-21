import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'quotes.db');
const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goodreads_work_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover_image_url TEXT,
    total_quotes INTEGER DEFAULT 0,
    scraped_at TEXT NOT NULL
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
  CREATE INDEX IF NOT EXISTS idx_books_work_id ON books(goodreads_work_id);
`);

export default db;
