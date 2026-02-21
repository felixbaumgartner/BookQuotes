import { Router, Request, Response } from 'express';
import { searchBooks } from '../scraper';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const results = await searchBooks(query.trim());
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to search Goodreads';
    res.status(502).json({ error: message });
  }
});

export default router;
