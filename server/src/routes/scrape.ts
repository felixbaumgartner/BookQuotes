import { Router, Request, Response } from 'express';
import db from '../db';
import { scrapeQuotesPage, delay, SCRAPE_DELAY } from '../scraper';

const router = Router();

const MAX_PAGES = 20;

// POST /api/books/:workId/scrape - Scrape quotes for a book (SSE)
router.post('/:workId/scrape', async (req: Request, res: Response) => {
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

  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  try {
    // Upsert book record
    const now = new Date().toISOString();
    let bookRow = db
      .prepare('SELECT id FROM books WHERE goodreads_work_id = ?')
      .get(workId) as { id: number } | undefined;

    if (bookRow) {
      db.prepare(
        'UPDATE books SET title = ?, author = ?, cover_image_url = ?, scraped_at = ? WHERE goodreads_work_id = ?'
      ).run(title, author, coverImageUrl || null, now, workId);
      // Delete existing quotes for re-scrape
      db.prepare('DELETE FROM quotes WHERE book_id = ?').run(bookRow.id);
    } else {
      const result = db
        .prepare(
          'INSERT INTO books (goodreads_work_id, title, author, cover_image_url, total_quotes, scraped_at) VALUES (?, ?, ?, ?, 0, ?)'
        )
        .run(workId, title, author, coverImageUrl || null, now);
      bookRow = { id: result.lastInsertRowid as number };
    }

    const bookId = bookRow.id;
    let totalQuotesCollected = 0;
    let totalPages = 1;

    // Insert quote prepared statement
    const insertQuote = db.prepare(
      'INSERT INTO quotes (book_id, quote_text, author, likes_count, tags, page_number) VALUES (?, ?, ?, ?, ?, ?)'
    );

    // Scrape first page
    sendEvent('progress', {
      page: 1,
      totalPages: 1,
      quotesFound: 0,
      status: 'Fetching page 1...',
    });

    const firstResult = await scrapeQuotesPage(workId, 1);
    totalPages = Math.min(firstResult.totalPages, MAX_PAGES);

    // Insert first page quotes
    const insertMany = db.transaction((quotes: typeof firstResult.quotes) => {
      for (const q of quotes) {
        insertQuote.run(
          bookId,
          q.quoteText,
          q.author,
          q.likesCount,
          JSON.stringify(q.tags),
          q.pageNumber
        );
      }
    });

    insertMany(firstResult.quotes);
    totalQuotesCollected += firstResult.quotes.length;

    sendEvent('progress', {
      page: 1,
      totalPages,
      quotesFound: totalQuotesCollected,
      status: `Fetched page 1 of ${totalPages} (${totalQuotesCollected} quotes)`,
    });

    // Scrape remaining pages
    for (let page = 2; page <= totalPages && !aborted; page++) {
      await delay(SCRAPE_DELAY);

      if (aborted) break;

      sendEvent('progress', {
        page,
        totalPages,
        quotesFound: totalQuotesCollected,
        status: `Fetching page ${page} of ${totalPages}...`,
      });

      try {
        const result = await scrapeQuotesPage(workId, page);

        if (result.quotes.length === 0) break;

        insertMany(result.quotes);
        totalQuotesCollected += result.quotes.length;

        // Update totalPages if pagination reveals more
        const newTotal = Math.min(result.totalPages, MAX_PAGES);
        if (newTotal > totalPages) totalPages = newTotal;

        sendEvent('progress', {
          page,
          totalPages,
          quotesFound: totalQuotesCollected,
          status: `Fetched page ${page} of ${totalPages} (${totalQuotesCollected} quotes)`,
        });
      } catch (err) {
        sendEvent('error', {
          message: `Error on page ${page}: ${err instanceof Error ? err.message : 'Unknown'}`,
        });
        // Continue to next page
      }
    }

    // Update book's total quotes
    db.prepare('UPDATE books SET total_quotes = ? WHERE id = ?').run(
      totalQuotesCollected,
      bookId
    );

    sendEvent('complete', {
      bookId,
      totalQuotes: totalQuotesCollected,
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
