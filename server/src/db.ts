import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'quotes.db');

// Wrapper that mimics better-sqlite3 API using sql.js
class DatabaseWrapper {
  private db!: SqlJsDatabase;
  private _dbPath: string;
  private _ready: Promise<void>;
  private _inTransaction = false;

  constructor(filePath: string) {
    this._dbPath = filePath;
    this._ready = this._init();
  }

  private async _init() {
    const SQL = await initSqlJs();
    if (fs.existsSync(this._dbPath)) {
      const buffer = fs.readFileSync(this._dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
  }

  async ready() {
    await this._ready;
  }

  private save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this._dbPath, buffer);
  }

  pragma(statement: string) {
    this.db.run(`PRAGMA ${statement}`);
  }

  exec(sql: string) {
    this.db.run(sql);
    this.save();
  }

  prepare(sql: string) {
    const self = this;

    return {
      all(...params: unknown[]) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params as any[]);
        }
        const results: Record<string, unknown>[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject();
          results.push(row as Record<string, unknown>);
        }
        stmt.free();
        return results;
      },

      get(...params: unknown[]) {
        const stmt = self.db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params as any[]);
        }
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row as Record<string, unknown>;
        }
        stmt.free();
        return undefined;
      },

      run(...params: unknown[]) {
        self.db.run(sql, params as any[]);
        const changes = self.db.getRowsModified();
        let lastInsertRowid = 0;
        try {
          const result = self.db.exec('SELECT last_insert_rowid() as id');
          if (result.length > 0 && result[0].values.length > 0) {
            lastInsertRowid = result[0].values[0][0] as number;
          }
        } catch {
          // ignore
        }
        // Only save to disk if we're not inside a transaction
        if (!self._inTransaction) {
          self.save();
        }
        return { changes, lastInsertRowid };
      },
    };
  }

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    const wrapper = ((...args: any[]) => {
      this._inTransaction = true;
      this.db.run('BEGIN');
      try {
        const result = fn(...args);
        this.db.run('COMMIT');
        this._inTransaction = false;
        this.save();
        return result;
      } catch (err) {
        this._inTransaction = false;
        try {
          this.db.run('ROLLBACK');
        } catch {
          // Transaction may have already been rolled back
        }
        throw err;
      }
    }) as unknown as T;
    return wrapper;
  }
}

const db = new DatabaseWrapper(dbPath);

// Export a promise that resolves when DB is ready, plus the db itself
export const dbReady = db.ready().then(() => {
  db.pragma('foreign_keys = ON');

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
});

export default db;
