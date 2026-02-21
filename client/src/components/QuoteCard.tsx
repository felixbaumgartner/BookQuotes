import { useState } from 'react';
import { Quote } from '../types';

interface Props {
  quote: Quote;
  index: number;
}

export default function QuoteCard({ quote, index }: Props) {
  const [copied, setCopied] = useState(false);

  const tags: string[] = (() => {
    try {
      return JSON.parse(quote.tags);
    } catch {
      return [];
    }
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`"${quote.quote_text}" — ${quote.author}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = `"${quote.quote_text}" — ${quote.author}`;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="bg-white border border-stone-200 rounded-xl p-6 hover:shadow-md transition-all animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s`, opacity: 0 }}
    >
      <blockquote className="quote-text text-charcoal mb-4">
        &ldquo;{quote.quote_text}&rdquo;
      </blockquote>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-charcoal-light font-medium">
          &mdash; {quote.author}
        </p>
        <div className="flex items-center gap-3">
          {quote.likes_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {quote.likes_count.toLocaleString()}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-stone-400 hover:text-accent hover:bg-stone-50 transition-all"
            title="Copy quote"
          >
            {copied ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
