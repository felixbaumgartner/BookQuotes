export interface SearchResult {
  title: string;
  author: string;
  coverImageUrl: string;
  workId: string;
}

export interface Book {
  id: number;
  goodreads_work_id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  total_quotes: number;
  scraped_at: string;
}

export interface Quote {
  id: number;
  book_id: number;
  quote_text: string;
  author: string;
  likes_count: number;
  tags: string;
  page_number: number;
}

export interface ScrapeProgress {
  page: number;
  totalPages: number;
  quotesFound: number;
  status: string;
}

export interface ScrapeComplete {
  bookId: number;
  totalQuotes: number;
}
