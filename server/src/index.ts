import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dbReady } from './db';
import searchRouter from './routes/search';
import booksRouter from './routes/books';
import scrapeRouter from './routes/scrape';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/search', searchRouter);
app.use('/api/books', booksRouter);
app.use('/api/books', scrapeRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Wait for DB to initialize, then start
dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`BookQuotes server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
