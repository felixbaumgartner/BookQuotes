import { Book } from '../types';

interface Props {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onDeleteBook: (bookId: number) => void;
}

export default function BookLibrary({ books, onSelectBook, onDeleteBook }: Props) {
  if (books.length === 0) {
    return (
      <div className="text-center py-20">
        <svg
          className="mx-auto mb-4 text-stone-300"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <h2 className="text-xl font-display text-charcoal mb-2">
          Your library is empty
        </h2>
        <p className="text-charcoal-light">
          Search for a book above to start collecting quotes.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-charcoal mb-4">
        Your Library
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map((book, i) => (
          <div
            key={book.id}
            className="group bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-all animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
          >
            <button
              onClick={() => onSelectBook(book)}
              className="w-full text-left p-4 flex gap-4"
            >
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-16 h-24 object-cover rounded shadow-sm flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-24 bg-stone-100 rounded flex items-center justify-center flex-shrink-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-charcoal truncate">
                  {book.title}
                </p>
                <p className="text-sm text-charcoal-light mt-0.5">
                  {book.author}
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  {book.total_quotes} quotes
                </p>
                <p className="text-xs text-stone-400">
                  Scraped {new Date(book.scraped_at).toLocaleDateString()}
                </p>
              </div>
            </button>
            <div className="border-t border-stone-100 px-4 py-2 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this book and all its quotes?')) {
                    onDeleteBook(book.id);
                  }
                }}
                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
