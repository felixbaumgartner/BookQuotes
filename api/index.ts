import { initDb } from '../server/src/db';
import app from '../server/src/index';

// Initialize database tables on first invocation
let dbInitialized = false;
const originalHandler = app;

export default async function handler(req: any, res: any) {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  return originalHandler(req, res);
}
