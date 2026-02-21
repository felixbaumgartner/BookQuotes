import { ScrapeProgress } from '../types';

interface Props {
  progress: ScrapeProgress | null;
  error: string;
  onRetry: () => void;
}

export default function ProgressIndicator({ progress, error, onRetry }: Props) {
  const percentage = progress
    ? Math.round((progress.page / progress.totalPages) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-md">
        {/* Animated book icon */}
        <div className="flex justify-center mb-6">
          <svg
            className="animate-pulse text-accent"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="12" y2="14" />
          </svg>
        </div>

        <h3 className="text-center font-display text-xl text-charcoal mb-4">
          Scraping Quotes
        </h3>

        {/* Progress bar */}
        <div className="w-full bg-stone-200 rounded-full h-2 mb-3">
          <div
            className="bg-accent rounded-full h-2 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Status text */}
        <p className="text-center text-sm text-charcoal-light">
          {progress
            ? progress.status
            : 'Connecting to Goodreads...'}
        </p>

        {progress && (
          <p className="text-center text-xs text-stone-400 mt-1">
            {progress.quotesFound} quotes found so far
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="mt-6 text-center">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Back to Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
