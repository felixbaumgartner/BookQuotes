import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { dbGet, dbRun, getDb } from '../db';
import { scrapeQuotesPage } from '../scraper';

const router = Router();

// POST /api/books/:workId/scrape - Scrape top quotes for a book
router.post('/:workId/scrape', async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { workId } = req.params;
  const { title, author, coverImageUrl } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Upsert book record
    const now = new Date().toISOString();
    let bookRow = (await dbGet(
      'SELECT id FROM books WHERE goodreads_work_id = ? AND user_id = ?',
      [workId, userId]
    )) as unknown as { id: number } | undefined;

    if (bookRow) {
      await dbRun(
        'UPDATE books SET title = ?, author = ?, cover_image_url = ?, scraped_at = ? WHERE goodreads_work_id = ? AND user_id = ?',
        [title, author, coverImageUrl || null, now, workId, userId]
      );
      await dbRun('DELETE FROM quotes WHERE book_id = ?', [bookRow.id]);
    } else {
      const result = await dbRun(
        'INSERT INTO books (user_id, goodreads_work_id, title, author, cover_image_url, total_quotes, scraped_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [userId, workId, title, author, coverImageUrl || null, now]
      );
      bookRow = { id: result.lastInsertRowid };
    }

    const bookId = bookRow.id;

    sendEvent('progress', {
      page: 1,
      totalPages: 1,
      quotesFound: 0,
      status: 'Fetching most liked quotes...',
    });

    // Scrape page 1 — Goodreads defaults to sorting by most liked
    const result = await scrapeQuotesPage(workId, 1);

    // Insert quotes using a batch transaction
    if (result.quotes.length > 0) {
      const db = getDb();
      await db.batch(
        result.quotes.map((q) => ({
          sql: 'INSERT INTO quotes (book_id, quote_text, author, likes_count, tags, page_number) VALUES (?, ?, ?, ?, ?, ?)',
          args: [
            bookId,
            q.quoteText,
            q.author,
            q.likesCount,
            JSON.stringify(q.tags),
            q.pageNumber,
          ],
        })),
        'write'
      );
    }

    // Update book's total quotes
    await dbRun('UPDATE books SET total_quotes = ? WHERE id = ?', [
      result.quotes.length,
      bookId,
    ]);

    sendEvent('progress', {
      page: 1,
      totalPages: 1,
      quotesFound: result.quotes.length,
      status: `Found ${result.quotes.length} most liked quotes`,
    });

    sendEvent('complete', {
      bookId,
      totalQuotes: result.quotes.length,
    });
  } catch (err) {
    console.error('Scrape error:', err);
    sendEvent('error', {
      message: `Scraping failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  } finally {
    res.end();
  }
});

export default router;
