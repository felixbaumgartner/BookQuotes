import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { initDb } from './db';
import searchRouter from './routes/search';
import booksRouter from './routes/books';
import scrapeRouter from './routes/scrape';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.use('/api/search', searchRouter);
app.use('/api/books', booksRouter);
app.use('/api/books', scrapeRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Initialize DB, then start server (only when run directly, not as serverless)
if (process.env.VERCEL !== '1') {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`BookQuotes server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
