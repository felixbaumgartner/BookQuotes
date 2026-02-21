import { useState, useEffect, useCallback } from 'react';
import { Book, SearchResult, Quote, ScrapeProgress } from './types';
import { getBooks, getQuotes, deleteBook, scrapeBook, searchBooks } from './api';
import SearchBar from './components/SearchBar';
import BookSearchResults from './components/BookSearchResults';
import BookLibrary from './components/BookLibrary';
import QuoteList from './components/QuoteList';
import ProgressIndicator from './components/ProgressIndicator';

type View = 'home' | 'search-results' | 'scraping' | 'quotes';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [savedBooks, setSavedBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  const [scrapeError, setScrapeError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      const books = await getBooks();
      setSavedBooks(books);
    } catch {
      // Silently fail on initial load
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchBooks(query);
      setSearchResults(results);
      setView('search-results');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setView('scraping');
    setScrapeProgress(null);
    setScrapeError('');

    scrapeBook(
      result.workId,
      result.title,
      result.author,
      result.coverImageUrl,
      (progress) => {
        setScrapeProgress(progress);
      },
      async (complete) => {
        // Scraping done — load the book and its quotes
        await loadBooks();
        const allBooks = await getBooks();
        const book = allBooks.find((b) => b.id === complete.bookId);
        if (book) {
          setSelectedBook(book);
          const q = await getQuotes(book.id);
          setQuotes(q);
          setView('quotes');
        } else {
          setView('home');
        }
      },
      (errorMsg) => {
        setScrapeError(errorMsg);
      }
    );
  };

  const handleSelectSavedBook = async (book: Book) => {
    setSelectedBook(book);
    try {
      const q = await getQuotes(book.id);
      setQuotes(q);
      setView('quotes');
    } catch {
      // Handle error
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      await deleteBook(bookId);
      setSavedBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (selectedBook?.id === bookId) {
        setSelectedBook(null);
        setQuotes([]);
        setView('home');
      }
    } catch {
      // Handle error
    }
  };

  const handleSortQuotes = async (sort: string) => {
    if (!selectedBook) return;
    try {
      const q = await getQuotes(selectedBook.id, sort);
      setQuotes(q);
    } catch {
      // Handle error
    }
  };

  const handleFilterQuotes = async (search: string) => {
    if (!selectedBook) return;
    try {
      const q = await getQuotes(selectedBook.id, undefined, search);
      setQuotes(q);
    } catch {
      // Handle error
    }
  };

  const handleBackHome = () => {
    setView('home');
    setSearchResults([]);
    setSearchError('');
    setScrapeProgress(null);
    setScrapeError('');
    loadBooks();
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone-200 bg-warm-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <button
            onClick={handleBackHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8B6914"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <h1 className="font-display text-2xl font-semibold text-charcoal tracking-tight">
              BookQuotes
            </h1>
          </button>
          {view !== 'home' && view !== 'search-results' && (
            <button
              onClick={handleBackHome}
              className="text-sm text-charcoal-light hover:text-charcoal transition-colors"
            >
              &larr; Back to Library
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search Bar - always visible on home and search-results */}
        {(view === 'home' || view === 'search-results') && (
          <div className="mb-8">
            <SearchBar onSearch={handleSearch} isSearching={isSearching} />
            {searchError && (
              <p className="mt-2 text-red-600 text-sm">{searchError}</p>
            )}
          </div>
        )}

        {/* Search Results */}
        {view === 'search-results' && searchResults.length > 0 && (
          <BookSearchResults
            results={searchResults}
            onSelect={handleSelectSearchResult}
          />
        )}

        {view === 'search-results' &&
          !isSearching &&
          searchResults.length === 0 &&
          !searchError && (
            <p className="text-center text-charcoal-light py-12">
              No books found. Try a different search term.
            </p>
          )}

        {/* Scraping Progress */}
        {view === 'scraping' && (
          <ProgressIndicator
            progress={scrapeProgress}
            error={scrapeError}
            onRetry={handleBackHome}
          />
        )}

        {/* Quote View */}
        {view === 'quotes' && selectedBook && (
          <QuoteList
            book={selectedBook}
            quotes={quotes}
            onSort={handleSortQuotes}
            onFilter={handleFilterQuotes}
            onBack={handleBackHome}
          />
        )}

        {/* Saved Books Library */}
        {view === 'home' && (
          <BookLibrary
            books={savedBooks}
            onSelectBook={handleSelectSavedBook}
            onDeleteBook={handleDeleteBook}
          />
        )}
      </main>
    </div>
  );
}
