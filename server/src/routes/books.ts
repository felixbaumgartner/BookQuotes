import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/books - List all saved books
router.get('/', (_req: Request, res: Response) => {
  try {
    const books = db
      .prepare(
        'SELECT id, goodreads_work_id, title, author, cover_image_url, total_quotes, scraped_at FROM books ORDER BY scraped_at DESC'
      )
      .all();
    res.json(books);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/:id - Get book details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const book = db
      .prepare(
        'SELECT id, goodreads_work_id, title, author, cover_image_url, total_quotes, scraped_at FROM books WHERE id = ?'
      )
      .get(req.params.id);

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
router.get('/:id/quotes', (req: Request, res: Response) => {
  try {
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

    const quotes = db.prepare(query).all(...params);
    res.json(quotes);
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// DELETE /api/books/:id - Delete book and its quotes
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db
      .prepare('DELETE FROM books WHERE id = ?')
      .run(req.params.id);

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
