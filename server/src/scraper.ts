import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface SearchResult {
  title: string;
  author: string;
  coverImageUrl: string;
  workId: string;
}

export interface ScrapedQuote {
  quoteText: string;
  author: string;
  likesCount: number;
  tags: string[];
  pageNumber: number;
}

async function searchGoodreads(query: string): Promise<SearchResult[]> {
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 10000,
  });

  const $ = cheerio.load(data);
  const results: SearchResult[] = [];

  $('tr[itemtype="http://schema.org/Book"]').each((i, el) => {
    if (results.length >= 10) return false;

    const $el = $(el);
    const title = $el.find('a.bookTitle span').text().trim();
    const author = $el.find('a.authorName span').text().trim();
    let coverImageUrl = $el.find('img.bookCover').attr('src') || '';

    const editionsLink = $el.find('a[href*="/work/editions/"]').attr('href') || '';
    const workIdMatch = editionsLink.match(/\/work\/editions\/(\d+)/);
    const workId = workIdMatch ? workIdMatch[1] : '';

    // Upgrade to larger cover image
    if (coverImageUrl) {
      coverImageUrl = coverImageUrl
        .replace(/\._S[XY]\d+_/, '')
        .replace(/\._(S[XY]\d+|CR\d+,\d+,\d+,\d+)_/, '');
    }

    if (title && workId) {
      results.push({ title, author, coverImageUrl, workId });
    }
  });

  return results;
}

async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=title,author_name,cover_i`;
  const { data } = await axios.get(url, { timeout: 30000 });

  if (!data.docs || !Array.isArray(data.docs)) return [];

  return data.docs
    .filter((doc: { title?: string }) => doc.title)
    .map((doc: { title?: string; author_name?: string[]; cover_i?: number }) => ({
      title: doc.title || '',
      author: doc.author_name?.[0] || 'Unknown Author',
      coverImageUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : '',
      workId: '',
    }));
}

export async function searchBooks(query: string): Promise<SearchResult[]> {
  // Try Goodreads first (fast), fall back to Open Library if blocked
  try {
    const results = await searchGoodreads(query);
    if (results.length > 0) return results;
  } catch {
    // Goodreads may block server IPs — fall back to Open Library
  }
  return searchOpenLibrary(query);
}

export async function findGoodreadsWorkId(title: string, author: string): Promise<string> {
  const query = `${title} ${author}`;
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 15000,
  });

  const editionsMatch = data.match(/\/work\/editions\/(\d+)/);
  if (editionsMatch) return editionsMatch[1];

  const quotesMatch = data.match(/\/work\/quotes\/(\d+)/);
  if (quotesMatch) return quotesMatch[1];

  throw new Error('Could not find this book on Goodreads. Try a different search term.');
}

export async function scrapeQuotesPage(
  workId: string,
  page: number
): Promise<{ quotes: ScrapedQuote[]; totalPages: number }> {
  const url = `https://www.goodreads.com/work/quotes/${workId}?page=${page}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  const quotes: ScrapedQuote[] = [];

  // Parse quotes from the page
  $('.quoteDetails').each((_, el) => {
    const $el = $(el);
    const quoteTextEl = $el.find('.quoteText');

    // Get quote text - need to extract just the quote, not the author line
    let quoteText = '';
    const quoteTextNode = quoteTextEl.contents().first();
    // The quote text is usually in text nodes before the <span> with author
    quoteTextEl.contents().each((_, node) => {
      if (node.type === 'text') {
        quoteText += $(node).text();
      }
    });

    // Clean up quote text
    quoteText = quoteText
      .replace(/\u201C|\u201D/g, '') // Remove smart quotes
      .replace(/\u2018|\u2019/g, "'") // Replace smart single quotes
      .replace(/^\s*\u2015\s*/, '') // Remove dash before author
      .replace(/\s+/g, ' ')
      .trim();

    // Remove trailing dash/em-dash that precedes author attribution
    quoteText = quoteText.replace(/\s*[\u2015\u2014\u2013―—–-]+\s*$/, '').trim();

    if (!quoteText) return;

    // Get author
    const authorEl = quoteTextEl.find('.authorOrTitle');
    const author = authorEl.text().replace(/,\s*$/, '').trim();

    // Get likes count
    const likesEl = $el.find('.right .smallText');
    const likesText = likesEl.text().trim();
    const likesMatch = likesText.match(/([\d,]+)\s*likes?/);
    const likesCount = likesMatch
      ? parseInt(likesMatch[1].replace(/,/g, ''), 10)
      : 0;

    // Get tags
    const tags: string[] = [];
    $el.find('.greyText.smallText.left a').each((_, tagEl) => {
      const tag = $(tagEl).text().trim();
      if (tag) tags.push(tag);
    });

    quotes.push({
      quoteText,
      author,
      likesCount,
      tags,
      pageNumber: page,
    });
  });

  // Determine total pages
  let totalPages = 1;
  const paginationLinks = $('a[href*="page="]');
  paginationLinks.each((_, el) => {
    const href = $(el).attr('href') || '';
    const pageMatch = href.match(/page=(\d+)/);
    if (pageMatch) {
      const p = parseInt(pageMatch[1], 10);
      if (p > totalPages) totalPages = p;
    }
  });

  // Also check the "next" link text for page info
  const nextLink = $('.next_page');
  if (nextLink.length === 0 || nextLink.hasClass('disabled')) {
    // We're on the last page, totalPages is current page
    if (page > totalPages) totalPages = page;
  }

  return { quotes, totalPages };
}

