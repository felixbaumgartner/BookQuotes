import { useState, useCallback, useRef } from 'react';
import { Book, Quote } from '../types';
import QuoteCard from './QuoteCard';

interface Props {
  book: Book;
  quotes: Quote[];
  onSort: (sort: string) => void;
  onFilter: (search: string) => void;
  onBack: () => void;
}

export default function QuoteList({ book, quotes, onSort, onFilter, onBack }: Props) {
  const [sortBy, setSortBy] = useState('page');
  const [filterText, setFilterText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSort = (value: string) => {
    setSortBy(value);
    onSort(value === 'likes' ? 'likes' : 'page');
  };

  const handleFilter = useCallback(
    (value: string) => {
      setFilterText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFilter(value);
      }, 300);
    },
    [onFilter]
  );

  return (
    <div>
      {/* Book Header */}
      <div className="flex items-start gap-4 mb-6">
        {book.cover_image_url && (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="w-20 h-28 object-cover rounded-lg shadow-md flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div>
          <h2 className="font-display text-2xl font-semibold text-charcoal">
            {book.title}
          </h2>
          <p className="text-charcoal-light mt-1">by {book.author}</p>
          <p className="text-sm text-stone-400 mt-1">
            {book.total_quotes} quotes
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={filterText}
            onChange={(e) => handleFilter(e.target.value)}
            placeholder="Filter quotes..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-charcoal placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('page')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'page'
                ? 'bg-accent text-white'
                : 'bg-white border border-stone-200 text-charcoal-light hover:border-accent/50'
            }`}
          >
            By Page
          </button>
          <button
            onClick={() => handleSort('likes')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'likes'
                ? 'bg-accent text-white'
                : 'bg-white border border-stone-200 text-charcoal-light hover:border-accent/50'
            }`}
          >
            Most Liked
          </button>
        </div>
      </div>

      {/* Quotes */}
      {quotes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-charcoal-light">
            {filterText
              ? 'No quotes match your filter.'
              : 'No quotes found for this book on Goodreads.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {quotes.map((quote, i) => (
            <QuoteCard key={quote.id} quote={quote} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
