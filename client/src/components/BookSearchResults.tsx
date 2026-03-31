import { SearchResult } from '../types';

interface Props {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

export default function BookSearchResults({ results, onSelect }: Props) {
  return (
    <div>
      <h2 className="text-lg font-medium text-charcoal mb-4">
        Search Results
      </h2>
      <div className="space-y-3">
        {results.map((result, i) => (
          <button
            key={`${result.workId}-${i}`}
            onClick={() => onSelect(result)}
            className="w-full flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl hover:border-accent/50 hover:shadow-md transition-all text-left animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
          >
            {result.coverImageUrl ? (
              <img
                src={result.coverImageUrl}
                alt={result.title}
                className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-16 bg-stone-100 rounded flex items-center justify-center flex-shrink-0">
                <svg
                  width="20"
                  height="20"
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
            <div className="min-w-0">
              <p className="font-medium text-charcoal truncate">
                {result.title}
              </p>
              <p className="text-sm text-charcoal-light">by {result.author}</p>
            </div>
            <svg
              className="ml-auto text-stone-300 flex-shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
