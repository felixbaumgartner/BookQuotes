import { SearchResult, Book, Quote } from './types';

const API_BASE = '/api';

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(err.error || 'Search failed');
  }
  return res.json();
}

export async function getBooks(): Promise<Book[]> {
  const res = await fetch(`${API_BASE}/books`);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function getBook(id: number): Promise<Book> {
  const res = await fetch(`${API_BASE}/books/${id}`);
  if (!res.ok) throw new Error('Failed to fetch book');
  return res.json();
}

export async function getQuotes(
  bookId: number,
  sort?: string,
  search?: string
): Promise<Quote[]> {
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (search) params.set('search', search);
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/books/${bookId}/quotes${qs ? '?' + qs : ''}`
  );
  if (!res.ok) throw new Error('Failed to fetch quotes');
  return res.json();
}

export async function deleteBook(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
}

export function scrapeBook(
  workId: string,
  title: string,
  author: string,
  coverImageUrl: string,
  onProgress: (data: { page: number; totalPages: number; quotesFound: number; status: string }) => void,
  onComplete: (data: { bookId: number; totalQuotes: number }) => void,
  onError: (message: string) => void
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/books/${workId}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, coverImageUrl }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Scrape failed' }));
        onError(err.error || 'Scrape failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (eventType === 'progress') {
                onProgress(parsed);
              } else if (eventType === 'complete') {
                onComplete(parsed);
              } else if (eventType === 'error') {
                onError(parsed.message);
              }
            } catch {
              // Skip malformed JSON
            }
            eventType = '';
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Network error');
      }
    });

  return () => controller.abort();
}
