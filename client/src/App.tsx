import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from '@clerk/clerk-react';
import { Book, SearchResult, Quote, ScrapeProgress } from './types';
import { getBooks, getQuotes, deleteBook, scrapeBook, searchBooks } from './api';
import SearchBar from './components/SearchBar';
import BookSearchResults from './components/BookSearchResults';
import BookLibrary from './components/BookLibrary';
import QuoteList from './components/QuoteList';
import ProgressIndicator from './components/ProgressIndicator';

type View = 'home' | 'search-results' | 'scraping' | 'quotes';

function AuthenticatedApp({ homeSignal }: { homeSignal: number }) {
  const { getToken } = useAuth();
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
      const token = await getToken();
      const books = await getBooks(token);
      setSavedBooks(books);
    } catch {
      // Silently fail on initial load
    }
  }, [getToken]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const token = await getToken();
      const results = await searchBooks(query, token);
      setSearchResults(results);
      setView('search-results');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (result: SearchResult) => {
    setView('scraping');
    setScrapeProgress(null);
    setScrapeError('');

    const token = await getToken();
    scrapeBook(
      result.workId,
      result.title,
      result.author,
      result.coverImageUrl,
      token,
      (progress) => {
        setScrapeProgress(progress);
      },
      async (complete) => {
        const tk = await getToken();
        await loadBooks();
        const allBooks = await getBooks(tk);
        const book = allBooks.find((b) => b.id === complete.bookId);
        if (book) {
          setSelectedBook(book);
          const q = await getQuotes(book.id, 'likes', undefined, tk);
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
      const token = await getToken();
      const q = await getQuotes(book.id, 'likes', undefined, token);
      setQuotes(q);
      setView('quotes');
    } catch {
      // Handle error
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      const token = await getToken();
      await deleteBook(bookId, token);
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

  const handleFilterQuotes = async (search: string) => {
    if (!selectedBook) return;
    try {
      const token = await getToken();
      const q = await getQuotes(selectedBook.id, undefined, search, token);
      setQuotes(q);
    } catch {
      // Handle error
    }
  };

  const handleBackHome = useCallback(() => {
    setView('home');
    setSearchResults([]);
    setSearchError('');
    setScrapeProgress(null);
    setScrapeError('');
    loadBooks();
  }, [loadBooks]);

  // Push a history entry when leaving home, so browser back returns to home
  const prevViewRef = useRef<View>('home');
  useEffect(() => {
    if (prevViewRef.current === 'home' && view !== 'home') {
      window.history.pushState({ view }, '');
    }
    prevViewRef.current = view;
  }, [view]);

  // Listen for browser back button
  useEffect(() => {
    const onPopState = () => handleBackHome();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleBackHome]);

  // Listen for logo click from the header
  useEffect(() => {
    if (homeSignal > 0) handleBackHome();
  }, [homeSignal, handleBackHome]);

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {(view === 'home' || view === 'search-results') && (
          <div className="mb-8">
            <SearchBar onSearch={handleSearch} isSearching={isSearching} />
            {searchError && (
              <p className="mt-2 text-red-600 text-sm">{searchError}</p>
            )}
          </div>
        )}

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

        {view === 'scraping' && (
          <ProgressIndicator
            progress={scrapeProgress}
            error={scrapeError}
            onRetry={handleBackHome}
          />
        )}

        {view === 'quotes' && selectedBook && (
          <QuoteList
            book={selectedBook}
            quotes={quotes}
            onFilter={handleFilterQuotes}
            onBack={handleBackHome}
          />
        )}

        {view === 'home' && (
          <BookLibrary
            books={savedBooks}
            onSelectBook={handleSelectSavedBook}
            onDeleteBook={handleDeleteBook}
          />
        )}
      </main>
    </>
  );
}

export default function App() {
  const [homeSignal, setHomeSignal] = useState(0);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone-200 bg-warm-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setHomeSignal((s) => s + 1)}
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
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      <SignedOut>
        <main className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-4xl font-semibold text-charcoal mb-4">
            Discover Book Quotes
          </h2>
          <p className="text-charcoal-light text-lg mb-8 max-w-xl mx-auto">
            Search any book, get the most loved quotes from Goodreads, and build your personal quote library.
          </p>
          <SignInButton mode="modal">
            <button className="px-6 py-3 rounded-lg text-base font-medium bg-accent text-white hover:bg-accent-hover transition-colors">
              Get Started
            </button>
          </SignInButton>
        </main>
      </SignedOut>

      <SignedIn>
        <AuthenticatedApp homeSignal={homeSignal} />
      </SignedIn>
    </div>
  );
}
