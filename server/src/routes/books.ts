import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { dbAll, dbGet, dbRun } from '../db';

const router = Router();

// GET /api/books - List all saved books for the authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const books = await dbAll(
      'SELECT id, goodreads_work_id, title, author, cover_image_url, total_quotes, scraped_at FROM books WHERE user_id = ? ORDER BY scraped_at DESC',
      [userId]
    );
    res.json(books);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/:id - Get book details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const book = await dbGet(
      'SELECT id, goodreads_work_id, title, author, cover_image_url, total_quotes, scraped_at FROM books WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (err) {
    console.error('Error fetching book:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// GET /api/books/:id/quotes - Get quotes for a book
router.get('/:id/quotes', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify book belongs to user
    const book = await dbGet('SELECT id FROM books WHERE id = ? AND user_id = ?', [
      parseInt(req.params.id, 10),
      userId,
    ]);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const { sort, search } = req.query;

    let query = 'SELECT * FROM quotes WHERE book_id = ?';
    const params: (string | number)[] = [parseInt(req.params.id, 10)];

    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND quote_text LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    if (sort === 'likes') {
      query += ' ORDER BY likes_count DESC';
    } else {
      query += ' ORDER BY page_number ASC, id ASC';
    }

    const quotes = await dbAll(query, params);
    res.json(quotes);
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// DELETE /api/books/:id - Delete book and its quotes
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await dbRun('DELETE FROM books WHERE id = ? AND user_id = ?', [
      req.params.id,
      userId,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

export default router;
